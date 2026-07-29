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
 * driver. Supports any MongoDB deployment reachable via a connection URI:
 * Atlas (mongodb+srv://...), self-hosted replica sets, or standalone instances.
 *
 * Because MongoDB speaks a binary wire protocol (not HTTP), this connector
 * instantiates a fresh MongoClient per action call and closes it when done,
 * ignoring the Axios client injected by the framework. This is a standalone
 * stopgap: once the connector-specs framework gains first-class pooled binary
 * transport support (RO-599, kibana#275613) this handler will be migrated to
 * use those facilities instead of connecting per call.
 *
 * Auth: HTTP Basic (username + password), read directly from ctx.secrets and
 * passed to MongoClient as `auth: { username, password }`.
 *
 * Known limitation: unlike a framework-provided client, this standalone version
 * does not enforce a host allowlist (SSRF protection) on the configured URI.
 * This is a temporary gap, to be closed when this migrates to the real
 * client-registry framework.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { Db, CollectionInfo } from 'mongodb';
import type { ConnectionString as ConnectionStringType } from 'mongodb-connection-string-url';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
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

// Stages that mutate data or execute arbitrary code — block these in aggregate
const DISALLOWED_AGGREGATE_STAGES = new Set(['$out', '$merge', '$function', '$accumulator']);

// Dynamic import keeps mongodb-connection-string-url (and its whatwg-url/tr46
// dependency chain) out of the browser bundle. Both kbn-optimizer and
// kbn-rspack-optimizer declare it a browser external so this import is never
// resolved during browser bundling.
const loadConnectionString = async (): Promise<typeof ConnectionStringType> => {
  const { ConnectionString } = await import(
    /* webpackChunkName: "mongodbConnectionStringUrl" */ 'mongodb-connection-string-url'
  );
  return ConnectionString;
};

/** Resolve the database name: action input → URI path → error. */
const resolveDb = async (inputDatabase: string | undefined, uri: string): Promise<string> => {
  if (inputDatabase) return inputDatabase;

  try {
    const ConnectionString = await loadConnectionString();
    const { pathname } = new ConnectionString(uri);
    const dbFromUri = pathname.slice(1);
    if (dbFromUri) return dbFromUri;
  } catch {
    // fall through
  }

  throw new Error(
    'database name is required — include it in the URI path (mongodb://host/mydb) or pass it in the action input'
  );
};

/**
 * Connect to MongoDB, run fn, always close.
 * Creates a fresh client per call (maxPoolSize: 1) as this standalone version
 * does not yet provide a pooled driver transport.
 */
const withClient = async <T>(
  ctx: ActionContext,
  database: string,
  fn: (db: Db) => Promise<T>
): Promise<T> => {
  // Dynamic import keeps the mongodb driver out of the browser bundle.
  // Both kbn-optimizer and kbn-rspack-optimizer declare 'mongodb' as a browser
  // external so this import is never resolved during browser bundling.
  const { MongoClient } = await import(/* webpackChunkName: "mongodbDriver" */ 'mongodb');
  const ConnectionString = await loadConnectionString();
  const { uri } = ctx.config as { uri: string };
  const { username, password } = ctx.secrets as { username: string; password: string };

  const client = new MongoClient(uri, {
    auth: { username, password },
    // Default to admin so credentials created there work without ?authSource=admin in the URI.
    // The driver gives programmatic options precedence over the connection string, so only
    // apply this default when the URI omits authSource — otherwise ?authSource=<db> in the URI
    // (which the help text and docs tell users to use) would be silently ignored.
    ...(new ConnectionString(uri).searchParams.has('authSource') ? {} : { authSource: 'admin' }),
    maxPoolSize: 1,
    serverSelectionTimeoutMS: 5_000,
    connectTimeoutMS: 10_000,
    // Bound in-flight query execution; prevents runaway scans from blocking indefinitely.
    timeoutMS: 30_000,
  });
  try {
    await client.connect();
    return await fn(client.db(database));
  } finally {
    // Ignore close errors so they never replace the original operation error.
    await client.close().catch(() => {});
  }
};

const DISALLOWED_STAGES_LIST = [...DISALLOWED_AGGREGATE_STAGES].join(', ');

/**
 * Validate that an aggregation pipeline contains no disallowed stages.
 * Recurses into sub-pipelines ($facet branches, $lookup.pipeline, $unionWith.pipeline).
 */
const assertReadOnlyPipeline = (pipeline: Record<string, unknown>[]): void => {
  for (const stage of pipeline) {
    for (const key of Object.keys(stage)) {
      if (DISALLOWED_AGGREGATE_STAGES.has(key)) {
        throw new Error(
          `Aggregation stage "${key}" is not allowed in read-only mode. ` +
            `Disallowed stages: ${DISALLOWED_STAGES_LIST}.`
        );
      }
      // Recurse into sub-pipelines that can contain arbitrary stages.
      if (key === '$facet') {
        const branches = stage[key] as Record<string, Record<string, unknown>[]>;
        for (const branch of Object.values(branches)) {
          if (Array.isArray(branch)) assertReadOnlyPipeline(branch);
        }
      } else if (key === '$lookup' || key === '$unionWith') {
        const nested = stage[key] as { pipeline?: Record<string, unknown>[] };
        if (Array.isArray(nested?.pipeline)) assertReadOnlyPipeline(nested.pipeline);
      }
    }
  }
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
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  // Credentials (username/password) are stored as encrypted secrets via the
  // basic auth type. The Axios client injected by the framework is not used
  // by any handler — this connector talks to MongoDB over its native driver.
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
              '?authSource=<db> to override.',
          }),
          placeholder: 'mongodb://hostname:27017/mydb',
        }),
    })
  ),

  actions: {
    find: {
      isTool: true,
      description:
        'Query documents in a MongoDB collection. Supports filter, projection, sort, limit, and skip. ' +
        'Returns an array of matching documents. Maximum 1000 documents per call. ' +
        'Use listCollections first to discover available collection names.',
      input: FindInputSchema,
      handler: async (ctx, input: FindInput) => {
        const { uri } = ctx.config as { uri: string };
        const database = await resolveDb(input.database, uri);
        return withClient(ctx, database, async (db) => {
          const cursor = db.collection(input.collection).find(input.filter ?? {}, {
            projection: input.projection,
            sort: input.sort,
            limit: input.limit ?? 100,
            skip: input.skip,
          });
          const documents = await cursor.toArray();
          return { count: documents.length, documents };
        });
      },
    },

    aggregate: {
      isTool: true,
      description:
        'Run a MongoDB aggregation pipeline on a collection. Supports all read-only pipeline stages ' +
        '($match, $group, $sort, $project, $lookup, $unwind, $limit, $skip, $count, etc.). ' +
        'Write stages ($out, $merge) and code-execution stages ($function, $accumulator) are rejected. ' +
        'A $limit stage is appended automatically unless the pipeline already ends with one. ' +
        'Maximum 1000 results.',
      input: AggregateInputSchema,
      handler: async (ctx, input: AggregateInput) => {
        assertReadOnlyPipeline(input.pipeline);

        const maxLimit = input.limit ?? 100;
        const lastStage = input.pipeline[input.pipeline.length - 1];
        const existingLimit =
          lastStage != null && '$limit' in lastStage
            ? (lastStage as { $limit: unknown }).$limit
            : null;

        // Always enforce the cap. If the pipeline already ends with $limit, replace it
        // if its value exceeds maxLimit; otherwise append a fresh $limit stage.
        const pipeline: Record<string, unknown>[] =
          existingLimit !== null
            ? typeof existingLimit === 'number' && existingLimit <= maxLimit
              ? input.pipeline
              : [...input.pipeline.slice(0, -1), { $limit: maxLimit }]
            : [...input.pipeline, { $limit: maxLimit }];

        const { uri } = ctx.config as { uri: string };
        const database = await resolveDb(input.database, uri);
        return withClient(ctx, database, async (db) => {
          const results = await db.collection(input.collection).aggregate(pipeline).toArray();
          return { count: results.length, results };
        });
      },
    },

    count: {
      isTool: true,
      description:
        'Count documents in a MongoDB collection matching an optional filter. ' +
        'Returns the total document count as a number. Useful for understanding data volume ' +
        'before running a find or aggregate.',
      input: CountInputSchema,
      handler: async (ctx, input: CountInput) => {
        const { uri } = ctx.config as { uri: string };
        const database = await resolveDb(input.database, uri);
        return withClient(ctx, database, async (db) => {
          const count = await db.collection(input.collection).countDocuments(input.filter ?? {});
          return { count };
        });
      },
    },

    listCollections: {
      isTool: true,
      description:
        'List all collections in the configured database. Returns collection names and types. ' +
        'Use this first to discover what data is available before calling find, aggregate, or count.',
      input: ListCollectionsInputSchema,
      handler: async (ctx, input: ListCollectionsInput) => {
        const { uri } = ctx.config as { uri: string };
        const database = await resolveDb(input.database, uri);
        return withClient(ctx, database, async (db) => {
          const { nameFilter } = input;
          const filter = nameFilter ? { name: { $regex: nameFilter } } : {};
          const collections = await db.listCollections<CollectionInfo>(filter).toArray();
          return {
            database,
            count: collections.length,
            collections: collections.map((c) => ({ name: c.name, type: c.type })),
          };
        });
      },
    },

    // ---- Workflow-only actions (write ops, not exposed to agents) ----

    insertOne: {
      isTool: false,
      description:
        'Insert a single document into a MongoDB collection. Use this to create a new record ' +
        'from a workflow, such as logging an event or saving a processed result. ' +
        'Returns the inserted document ID and whether the write was acknowledged. ' +
        'Workflow-only — not available to agents.',
      input: InsertOneInputSchema,
      handler: async (ctx, input: InsertOneInput) => {
        const { uri } = ctx.config as { uri: string };
        const database = await resolveDb(input.database, uri);
        return withClient(ctx, database, async (db) => {
          const result = await db.collection(input.collection).insertOne(input.document);
          return { insertedId: String(result.insertedId), acknowledged: result.acknowledged };
        });
      },
    },

    updateOne: {
      isTool: false,
      description:
        'Update the first document matching a filter in a MongoDB collection. Use this to ' +
        'modify an existing record from a workflow, such as changing a status field or applying ' +
        'a partial update. Set upsert to insert a new document when no match is found. ' +
        'Returns matched and modified counts, the upserted document ID (if any), and whether ' +
        'the write was acknowledged. Workflow-only — not available to agents.',
      input: UpdateOneInputSchema,
      handler: async (ctx, input: UpdateOneInput) => {
        const { uri } = ctx.config as { uri: string };
        const database = await resolveDb(input.database, uri);
        return withClient(ctx, database, async (db) => {
          const result = await db
            .collection(input.collection)
            .updateOne(input.filter, input.update, { upsert: input.upsert ?? false });
          return {
            matchedCount: result.matchedCount,
            modifiedCount: result.modifiedCount,
            upsertedId: result.upsertedId != null ? String(result.upsertedId) : null,
            acknowledged: result.acknowledged,
          };
        });
      },
    },

    deleteOne: {
      isTool: false,
      description:
        'Delete the first document matching a filter from a MongoDB collection. Use this to ' +
        'remove a single record from a workflow, such as cleaning up a processed item. ' +
        'Returns the number of documents deleted and whether the write was acknowledged. ' +
        'Workflow-only — not available to agents.',
      input: DeleteOneInputSchema,
      handler: async (ctx, input: DeleteOneInput) => {
        const { uri } = ctx.config as { uri: string };
        const database = await resolveDb(input.database, uri);
        return withClient(ctx, database, async (db) => {
          const result = await db.collection(input.collection).deleteOne(input.filter);
          return { deletedCount: result.deletedCount, acknowledged: result.acknowledged };
        });
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.mongodb.test.description', {
      defaultMessage:
        'Verifies the connection URI and credentials are valid by pinging the MongoDB deployment.',
    }),
    handler: async (ctx) => {
      try {
        // Ping against admin — it always exists and doesn't require the
        // configured URI to include a database path.
        await withClient(ctx, 'admin', async (db) => {
          await db.command({ ping: 1 });
        });
        return { ok: true, message: 'Connected to MongoDB successfully.' };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, message: `Connection failed: ${message}` };
      }
    },
  },

  skill: [
    '## MongoDB Connector',
    '',
    'Provides access to MongoDB collections. Supports Atlas clusters',
    '(mongodb+srv://), self-hosted replica sets, and standalone instances.',
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
    '- Aggregate stages $out, $merge, $function, and $accumulator are rejected.',
    '- Large result sets slow responses; prefer projections and tight filters.',
  ].join('\n'),
};
