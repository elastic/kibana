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
 * driver. Supports any MongoDB deployment reachable via a connection string:
 * Atlas (mongodb+srv://...), self-hosted replica sets, or standalone instances.
 *
 * Because MongoDB speaks a binary wire protocol (not HTTP), this connector
 * instantiates a fresh MongoClient per action call and closes it when done,
 * ignoring the Axios client injected by the framework. Once the connector-specs
 * framework gains first-class binary transport support this handler will be
 * migrated to use those facilities.
 *
 * Auth: the connection string encodes all credentials (user, password, authSource,
 * TLS options). It is stored as a secret and never exposed to the browser.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { Db, CollectionInfo } from 'mongodb';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { MONGODB_CONNECTION_STRING_AUTH_ID } from '../../auth_types/mongodb_connection_string';
import type { FindInput, AggregateInput, CountInput, ListCollectionsInput } from './types';
import {
  FindInputSchema,
  AggregateInputSchema,
  CountInputSchema,
  ListCollectionsInputSchema,
} from './types';

// Stages that mutate data or execute arbitrary code — block these in aggregate
const DISALLOWED_AGGREGATE_STAGES = new Set(['$out', '$merge', '$function', '$accumulator']);

/**
 * Connect to MongoDB, run fn, always close.
 * Creates a fresh client per call (maxPoolSize: 1) as the framework does not
 * yet provide a pooled driver transport.
 */
const withClient = async <T>(ctx: ActionContext, fn: (db: Db) => Promise<T>): Promise<T> => {
  // Dynamic import keeps the mongodb driver out of the browser bundle.
  // Both kbn-optimizer and kbn-rspack-optimizer declare 'mongodb' as a browser
  // external so this import is never resolved during browser bundling.
  const { MongoClient } = await import(/* webpackChunkName: "mongodbDriver" */ 'mongodb');
  const { connectionString } = ctx.secrets as { connectionString: string };
  const { database } = ctx.config as { database: string };

  const client = new MongoClient(connectionString, {
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
        'Query documents in MongoDB collections using find, aggregate, count, and listCollections',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  // The connection string carries all credentials and is stored as an encrypted
  // secret via the mongodb_connection_string auth type. The Axios client
  // injected by the framework is not used by any handler.
  auth: {
    types: [MONGODB_CONNECTION_STRING_AUTH_ID],
  },

  // Config (unencrypted): only the database name.
  // The connection string (sensitive) lives in auth secrets, not here.
  schema: lazySchema(() =>
    z.object({
      database: z
        .string()
        .min(1)
        .describe('Default database name to use for all actions.')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.mongodb.config.database.label', {
            defaultMessage: 'Database',
          }),
          helpText: i18n.translate('core.kibanaConnectorSpecs.mongodb.config.database.helpText', {
            defaultMessage: 'The name of the MongoDB database to query.',
          }),
          placeholder: 'my_database',
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
        return withClient(ctx, async (db) => {
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

        return withClient(ctx, async (db) => {
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
        return withClient(ctx, async (db) => {
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
        return withClient(ctx, async (db) => {
          const { nameFilter } = input;
          const filter = nameFilter ? { name: { $regex: nameFilter } } : {};
          const collections = await db.listCollections<CollectionInfo>(filter).toArray();
          return {
            database: (ctx.config as { database: string }).database,
            count: collections.length,
            collections: collections.map((c) => ({ name: c.name, type: c.type })),
          };
        });
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.mongodb.test.description', {
      defaultMessage: 'Verifies the connection string is valid by pinging the MongoDB deployment.',
    }),
    handler: async (ctx) => {
      try {
        await withClient(ctx, async (db) => {
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
    'Provides read-only access to MongoDB collections. Supports Atlas clusters',
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
    '### Important constraints',
    '- Read-only: find, aggregate, count, and listCollections only.',
    '- Maximum 1000 documents per call. Use skip + limit for pagination.',
    '- Aggregate stages $out, $merge, $function, and $accumulator are rejected.',
    '- Large result sets slow responses; prefer projections and tight filters.',
  ].join('\n'),
};
