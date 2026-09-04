/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * MongoDB Connector
 *
 * Provides read-only access to MongoDB collections using the native MongoDB
 * driver. Supports any MongoDB deployment reachable via a connection URI,
 * using mongodb:// or mongodb+srv://: replica sets, sharded clusters, or
 * standalone instances.
 *
 * Because MongoDB speaks a binary wire protocol (not HTTP), this connector uses
 * the pooled `mongodb` client type (RO-599, kibana#275613) via `ctx.getClient('mongodb')`
 * rather than the Axios client injected by the framework. The client type
 * (`lib/clients/mongodb_client_type.ts`) owns connecting, host-allowlist enforcement,
 * and credential decoding; handlers here only run queries.
 *
 * Auth: HTTP Basic (username + password). Credentials are decoded from
 * `CredentialAccessor.getAuthHeaders()` by the client type, not read directly here.
 */

import { escapeRegExp } from 'lodash';
import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { CollectionInfo } from 'mongodb';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { loadConnectionString } from '../../lib/clients/load_connection_string';
import type {
  FindInput,
  AggregateInput,
  CountInput,
  ListCollectionsInput,
  InsertOneInput,
  UpdateOneInput,
  DeleteOneInput,
} from './types';
import {
  FindInputSchema,
  AggregateInputSchema,
  CountInputSchema,
  ListCollectionsInputSchema,
  InsertOneInputSchema,
  UpdateOneInputSchema,
  DeleteOneInputSchema,
} from './types';

// Operators that mutate data or execute arbitrary server-side JavaScript. $out/$merge only
// occur as aggregation pipeline stages; $function/$accumulator/$where can appear anywhere in an
// aggregation pipeline (nested inside $project, $group, $addFields, $match's $expr, ...) or in a
// find/count filter ($where directly, $function/$accumulator via $expr) — block all of them,
// everywhere, on every agent-facing read action.
const DISALLOWED_OPERATORS = new Set(['$out', '$merge', '$function', '$accumulator', '$where']);

/** Resolve the database name: action input → URI path → error. */
const resolveDb = async (inputDatabase: string | undefined, uri: string): Promise<string> => {
  if (inputDatabase) return inputDatabase;

  // Let a malformed uri throw its own MongoParseError here rather than masking it —
  // ctx.getClient('mongodb') would hit the same parse failure, but only after this call.
  const ConnectionString = await loadConnectionString();
  const { pathname } = new ConnectionString(uri);
  const dbFromUri = pathname.slice(1);
  if (dbFromUri) return dbFromUri;

  throw new Error(
    'database name is required — include it in the URI path (mongodb://host/mydb) or pass it in the action input'
  );
};

/** Resolve the database name for an action call: action input → connector's configured URI path. */
const getDatabase = async (
  ctx: ActionContext,
  inputDatabase: string | undefined
): Promise<string> => {
  const { uri } = ctx.config as { uri: string };
  return resolveDb(inputDatabase, uri);
};

const DISALLOWED_OPERATORS_LIST = [...DISALLOWED_OPERATORS].join(', ');

/**
 * Recursively walk an aggregation pipeline or a find/count filter/projection and reject any
 * disallowed operator, at any depth. $function/$accumulator/$where are expression operators
 * that can be nested arbitrarily deep inside stages or filters (e.g. $project.field.$function,
 * $match.$expr.$function) — a shallow, top-level-only check cannot catch them, so this walks
 * every array element and every object value rather than only known sub-pipeline locations.
 */
const assertReadOnly = (value: unknown): void => {
  if (Array.isArray(value)) {
    for (const item of value) assertReadOnly(item);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (DISALLOWED_OPERATORS.has(key)) {
      throw new Error(
        `"${key}" is not allowed in read-only mode. Disallowed: ${DISALLOWED_OPERATORS_LIST}.`
      );
    }
    assertReadOnly(child);
  }
};

/**
 * Enforce maxLimit on a pipeline's final result count, recursing into every `$facet` branch and
 * every `$lookup`/`$unionWith` sub-pipeline. Each of these emits its "joined"/"unioned" data
 * nested inside a field of the outer documents (a `$facet` document's branch arrays, or the
 * `as` field a `$lookup` writes into), so a $limit on the outer pipeline only ever bounds the
 * outer document count — it does nothing to bound the data volume hidden inside those nested
 * results. Clamping each nested sub-pipeline the same way the outer pipeline is clamped closes
 * that gap.
 */
const clampPipelineLimit = (
  pipeline: Record<string, unknown>[],
  maxLimit: number
): Record<string, unknown>[] => {
  const lastStage = pipeline[pipeline.length - 1];
  const existingLimit =
    lastStage != null && '$limit' in lastStage ? (lastStage as { $limit: unknown }).$limit : null;

  const limited: Record<string, unknown>[] =
    existingLimit === null
      ? [...pipeline, { $limit: maxLimit }]
      : typeof existingLimit === 'number' && existingLimit <= maxLimit
      ? pipeline
      : [...pipeline.slice(0, -1), { $limit: maxLimit }];

  return limited.map((stage) => {
    if ('$facet' in stage) {
      const facet = stage.$facet as Record<string, unknown>;
      const clampedFacet = Object.fromEntries(
        Object.entries(facet).map(([branchName, branchPipeline]) => [
          branchName,
          Array.isArray(branchPipeline)
            ? clampPipelineLimit(branchPipeline, maxLimit)
            : branchPipeline,
        ])
      );
      return { ...stage, $facet: clampedFacet };
    }
    if ('$lookup' in stage) {
      const lookup = stage.$lookup as Record<string, unknown>;
      if (!Array.isArray(lookup.pipeline)) return stage;
      return {
        ...stage,
        $lookup: { ...lookup, pipeline: clampPipelineLimit(lookup.pipeline, maxLimit) },
      };
    }
    if ('$unionWith' in stage) {
      const unionWith = stage.$unionWith;
      // $unionWith accepts either a bare collection-name string or { coll, pipeline }.
      if (
        typeof unionWith === 'string' ||
        !Array.isArray((unionWith as { pipeline?: unknown })?.pipeline)
      ) {
        return stage;
      }
      const unionWithObj = unionWith as { pipeline: Record<string, unknown>[] };
      return {
        ...stage,
        $unionWith: {
          ...unionWithObj,
          pipeline: clampPipelineLimit(unionWithObj.pipeline, maxLimit),
        },
      };
    }
    return stage;
  });
};

export const MongoDBConnector: ConnectorSpec = {
  metadata: {
    id: '.mongodb',
    displayName: 'MongoDB',
    description: i18n.translate('core.kibanaConnectorSpecs.mongodb.metadata.description', {
      defaultMessage:
        'Query and write to MongoDB collections using find, aggregate, count, and listCollections, ' +
        'plus insertOne, updateOne, and deleteOne for workflows.',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // New connector types can only declare 'agentBuilder' in their introducing PR;
    // 'workflows' follows in a later PR once this connector is registered in every
    // Production-NonCanary version (see kbn-connector-specs/.claude/skills/create-connector).
    supportedFeatureIds: ['agentBuilder'],
  },

  // Credentials (username/password) are stored as encrypted secrets via the
  // basic auth type. The mongodb client type decodes them from
  // CredentialAccessor.getAuthHeaders() at connection time; no handler here
  // reads ctx.secrets or uses the Axios client injected by the framework.
  auth: {
    types: ['basic'],
  },

  // Config (unencrypted): the connection URI. Credentials are NOT included in
  // the URI — they live in auth secrets (basic auth) instead.
  schema: lazySchema(() =>
    z.object({
      uri: z
        .string()
        .min(1)
        .max(2048)
        .describe('MongoDB connection URI.')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.mongodb.config.uri.label', {
            defaultMessage: 'Connection URI',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.mongodb.config.uri.helpText', {
            defaultMessage:
              'Full MongoDB connection string. Supports mongodb:// and mongodb+srv:// schemes. ' +
              'Include the database name in the path (e.g. /mydb) to use it as the default for actions. ' +
              'Credentials are authenticated against the admin database by default; append ' +
              '?authSource=yourDbName to override.',
          }),
          placeholder: 'mongodb://hostname:27017/mydb',
        }),
    })
  ),

  actions: {
    find: {
      isTool: true,
      scope: 'read',
      description:
        'Query documents in a MongoDB collection. Supports filter, projection, sort, limit, and skip. ' +
        'Returns an array of matching documents. Maximum 1000 documents per call. ' +
        'Code-execution operators ($where, $expr with $function/$accumulator) are rejected. ' +
        'Use listCollections first to discover available collection names.',
      input: FindInputSchema,
      handler: async (ctx, input: FindInput) => {
        assertReadOnly(input.filter);
        assertReadOnly(input.projection);
        const database = await getDatabase(ctx, input.database);
        const client = await ctx.getClient('mongodb');
        const cursor = client
          .db(database)
          .collection(input.collection)
          .find(input.filter ?? {}, {
            projection: input.projection,
            sort: input.sort,
            limit: input.limit ?? 100,
            skip: input.skip,
          });
        const documents = await cursor.toArray();
        return { count: documents.length, documents };
      },
    },

    aggregate: {
      isTool: true,
      scope: 'read',
      description:
        'Run a MongoDB aggregation pipeline on a collection. Supports all read-only pipeline stages ' +
        '($match, $group, $sort, $project, $lookup, $unwind, $limit, $skip, $count, etc.). ' +
        'Write stages ($out, $merge) and code-execution operators ($where, $function, $accumulator) ' +
        'are rejected, at any nesting depth. ' +
        'A $limit stage is appended automatically unless the pipeline already ends with one, ' +
        'including inside every $facet branch and every $lookup/$unionWith sub-pipeline. ' +
        'Maximum 1000 results per branch or sub-pipeline.',
      input: AggregateInputSchema,
      handler: async (ctx, input: AggregateInput) => {
        assertReadOnly(input.pipeline);

        const maxLimit = input.limit ?? 100;
        const pipeline = clampPipelineLimit(input.pipeline, maxLimit);

        const database = await getDatabase(ctx, input.database);
        const client = await ctx.getClient('mongodb');
        const results = await client
          .db(database)
          .collection(input.collection)
          .aggregate(pipeline)
          .toArray();
        return { count: results.length, results };
      },
    },

    count: {
      isTool: true,
      scope: 'read',
      description:
        'Count documents in a MongoDB collection matching an optional filter. ' +
        'Returns the total document count as a number. Useful for understanding data volume ' +
        'before running a find or aggregate. ' +
        'Code-execution operators ($where, $expr with $function/$accumulator) are rejected.',
      input: CountInputSchema,
      handler: async (ctx, input: CountInput) => {
        assertReadOnly(input.filter);
        const database = await getDatabase(ctx, input.database);
        const client = await ctx.getClient('mongodb');
        const count = await client
          .db(database)
          .collection(input.collection)
          .countDocuments(input.filter ?? {});
        return { count };
      },
    },

    listCollections: {
      isTool: true,
      scope: 'read',
      description:
        'List all collections in the configured database. Returns collection names and types. ' +
        'Use this first to discover what data is available before calling find, aggregate, or count.',
      input: ListCollectionsInputSchema,
      handler: async (ctx, input: ListCollectionsInput) => {
        const database = await getDatabase(ctx, input.database);
        const client = await ctx.getClient('mongodb');
        const { nameFilter } = input;
        // Escape regex metacharacters so nameFilter is matched literally instead of being
        // evaluated as a live regex — otherwise metacharacters change matching behavior (e.g.
        // "my.log" would also match "myXlog") and pathological patterns become a ReDoS vector on
        // the server, since this reaches $regex directly from an agent-facing (isTool: true) input.
        const filter = nameFilter ? { name: { $regex: escapeRegExp(nameFilter) } } : {};
        const collections = await client
          .db(database)
          .listCollections<CollectionInfo>(filter)
          .toArray();
        return {
          database,
          count: collections.length,
          collections: collections.map((c) => ({ name: c.name, type: c.type })),
        };
      },
    },

    // ---- Workflow-only actions (write ops, not exposed to agents) ----

    insertOne: {
      isTool: false,
      scope: 'write',
      description:
        'Insert a single document into a MongoDB collection. Use this to create a new record ' +
        'from a workflow, such as logging an event or saving a processed result. ' +
        'Returns the inserted document ID and whether the write was acknowledged. ' +
        'Workflow-only — not available to agents.',
      input: InsertOneInputSchema,
      handler: async (ctx, input: InsertOneInput) => {
        const database = await getDatabase(ctx, input.database);
        const client = await ctx.getClient('mongodb');
        const result = await client
          .db(database)
          .collection(input.collection)
          .insertOne(input.document);
        return { insertedId: String(result.insertedId), acknowledged: result.acknowledged };
      },
    },

    updateOne: {
      isTool: false,
      scope: 'write',
      description:
        'Update the first document matching a filter in a MongoDB collection. Use this to ' +
        'modify an existing record from a workflow, such as changing a status field or applying ' +
        'a partial update. Set upsert to insert a new document when no match is found. ' +
        'Returns matched and modified counts, the upserted document ID (if any), and whether ' +
        'the write was acknowledged. Workflow-only — not available to agents.',
      input: UpdateOneInputSchema,
      handler: async (ctx, input: UpdateOneInput) => {
        const database = await getDatabase(ctx, input.database);
        const client = await ctx.getClient('mongodb');
        const result = await client
          .db(database)
          .collection(input.collection)
          .updateOne(input.filter, input.update, { upsert: input.upsert ?? false });
        return {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          upsertedId: result.upsertedId != null ? String(result.upsertedId) : null,
          acknowledged: result.acknowledged,
        };
      },
    },

    deleteOne: {
      isTool: false,
      scope: 'destroy',
      description:
        'Delete the first document matching a filter from a MongoDB collection. Use this to ' +
        'remove a single record from a workflow, such as cleaning up a processed item. ' +
        'Returns the number of documents deleted and whether the write was acknowledged. ' +
        'Workflow-only — not available to agents.',
      input: DeleteOneInputSchema,
      handler: async (ctx, input: DeleteOneInput) => {
        const database = await getDatabase(ctx, input.database);
        const client = await ctx.getClient('mongodb');
        const result = await client
          .db(database)
          .collection(input.collection)
          .deleteOne(input.filter);
        return { deletedCount: result.deletedCount, acknowledged: result.acknowledged };
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.mongodb.test.description', {
      defaultMessage:
        'Verifies the connection URI and credentials are valid by pinging the MongoDB deployment.',
    }),
    handler: async (ctx) => {
      // Ping against admin — it always exists and doesn't require the
      // configured URI to include a database path. A resolved value means
      // success; the executor treats a thrown error as failure.
      const client = await ctx.getClient('mongodb');
      await client.db('admin').command({ ping: 1 });
      return {};
    },
  },

  skill: [
    '## MongoDB Connector',
    '',
    'Provides access to MongoDB collections. Supports any deployment reachable',
    'via a mongodb:// or mongodb+srv:// connection URI: replica sets, sharded',
    'clusters, and standalone instances.',
    '',
    '### Discovery pattern',
    'Always start with discovery before querying:',
    '1. `listCollections` — see all collections in the database.',
    '2. `find` with a small limit (e.g. 3) — inspect the document shape.',
    '3. `count` — understand data volume before a large query.',
    '4. `aggregate` — group, filter, or transform data.',
    '',
    '### Common find patterns',
    '- All documents (up to limit): `find({ collection: "orders" })`',
    '- Filtered: `find({ collection: "orders", filter: {"status": "pending"} })`',
    '- Specific fields: `find({ collection: "users", projection: {"name": 1, "email": 1, "_id": 0} })`',
    '- Sorted: `find({ collection: "events", sort: {"timestamp": -1}, limit: 10 })`',
    '',
    '### Common aggregate patterns',
    '- Group and count: `[{"$group": {"_id": "$status", "count": {"$sum": 1}}}]`',
    '- Filter then group: `[{"$match": {"region": "US"}}, {"$group": {"_id": "$product", "total": {"$sum": "$revenue"}}}]`',
    '',
    '### Write actions (workflows only — not available to agents)',
    '- Insert: `insertOne({ collection: "orders", document: {"status": "pending"} })`',
    '- Update: `updateOne({ collection: "orders", filter: {"_id": "abc"}, update: {"$set": {"status": "shipped"}} })`',
    '- Delete: `deleteOne({ collection: "orders", filter: {"_id": "abc"} })`',
    '',
    '### Important constraints',
    '- Agent-facing tool actions (find, aggregate, count, listCollections) are read-only.',
    '- insertOne, updateOne, and deleteOne are workflow-only and never exposed to agents.',
    '- Maximum 1000 documents per call. Use skip + limit for pagination.',
    '- $out, $merge, $function, $accumulator, and $where are rejected everywhere ' +
      '(pipelines, filters, projections), at any nesting depth.',
    '- Large result sets slow responses; prefer projections and tight filters.',
  ].join('\n'),
};
