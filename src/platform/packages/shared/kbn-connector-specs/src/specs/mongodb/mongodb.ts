/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * MongoDB Connector (v2)
 *
 * Uses the pooled MongoDB client type (ctx.getClient('mongodb')) to talk to
 * MongoDB over the native wire protocol rather than an HTTP REST API. This
 * connector validates the binary-protocol path introduced in RO-599 and acts
 * as the second client type in the pluggable client registry.
 *
 * Auth: HTTP Basic (username + password), decoded by the MongoDB client type
 * and passed to MongoClient as `auth: { username, password }`.
 *
 * Tool actions (agent-facing, isTool: true):
 *   find, aggregate, listCollections
 *
 * Workflow-only actions (isTool: false — write ops blocked from agents):
 *   insertOne, updateOne, deleteOne
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import {
  FindInputSchema,
  AggregateInputSchema,
  ListCollectionsInputSchema,
  InsertOneInputSchema,
  UpdateOneInputSchema,
  DeleteOneInputSchema,
} from './types';
import type {
  FindInput,
  AggregateInput,
  ListCollectionsInput,
  InsertOneInput,
  UpdateOneInput,
  DeleteOneInput,
} from './types';

/** Resolve the database name from action input, falling back to connector default config. */
const resolveDb = (
  inputDatabase: string | undefined,
  config: Record<string, unknown> | undefined
): string => {
  const name = inputDatabase ?? (config?.database as string | undefined);
  if (!name) {
    throw new Error(
      'database name is required — set it in the action input or as the connector default database'
    );
  }
  return name;
};

export const MongoDBConnector: ConnectorSpec = {
  metadata: {
    id: '.mongodb',
    displayName: 'MongoDB',
    description: i18n.translate('connectorSpecs.mongodb.metadata.description', {
      defaultMessage:
        'Query and write to MongoDB collections using the native wire protocol. Supports find, aggregate, and collection management.',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['agentBuilder', 'workflows'],
  },

  auth: {
    types: ['basic'],
  },

  schema: lazySchema(() =>
    z.object({
      host: z.string().min(1).describe('MongoDB server hostname or IP address.'),
      port: z
        .number()
        .int()
        .min(1)
        .max(65535)
        .optional()
        .default(27017)
        .describe('MongoDB port (default: 27017).'),
      database: z
        .string()
        .min(1)
        .describe('Default database name used when actions omit database.'),
      tls: z.boolean().optional().default(false).describe('Enable TLS/SSL for the connection.'),
    })
  ),

  test: {
    handler: async (ctx) => {
      const mongoClient = await ctx.getClient('mongodb');
      await mongoClient.db('admin').command({ ping: 1 });
      return { ok: true, message: 'MongoDB connection successful' };
    },
  },

  actions: {
    // ---- Tool actions (agent-facing) ----

    find: {
      isTool: true,
      description:
        'Query a MongoDB collection and return matching documents. Use filter to narrow results, projection to select fields, sort to order them, and limit to cap the count.',
      input: FindInputSchema,
      handler: async (ctx, input) => {
        const { collection, database, filter, projection, sort, limit } = input as FindInput;
        const mongoClient = await ctx.getClient('mongodb');
        const db = mongoClient.db(resolveDb(database, ctx.config));
        const documents = await db
          .collection(collection)
          .find(filter ?? {}, { projection, sort, limit: limit ?? 100 })
          .toArray();
        return { documents, count: documents.length };
      },
    },

    aggregate: {
      isTool: true,
      description:
        'Run a MongoDB aggregation pipeline on a collection. Use $match, $group, $sort, $project, and other stages to transform and summarise data.',
      input: AggregateInputSchema,
      handler: async (ctx, input) => {
        const { collection, database, pipeline, limit } = input as AggregateInput;
        const mongoClient = await ctx.getClient('mongodb');
        const db = mongoClient.db(resolveDb(database, ctx.config));
        let cursor = db.collection(collection).aggregate(pipeline);
        if (limit != null) {
          cursor = cursor.limit(limit);
        }
        const documents = await cursor.toArray();
        return { documents, count: documents.length };
      },
    },

    listCollections: {
      isTool: true,
      description:
        'List the collections in a MongoDB database. Useful for schema discovery before writing a query.',
      input: ListCollectionsInputSchema,
      handler: async (ctx, input) => {
        const { database } = input as ListCollectionsInput;
        const mongoClient = await ctx.getClient('mongodb');
        const db = mongoClient.db(resolveDb(database, ctx.config));
        const collections = await db.listCollections().toArray();
        return {
          collections: collections.map((c) => ({ name: c.name, type: c.type })),
          count: collections.length,
        };
      },
    },

    // ---- Workflow-only actions (write ops, not exposed to agents) ----

    insertOne: {
      isTool: false,
      description: 'Insert a single document into a MongoDB collection.',
      input: InsertOneInputSchema,
      handler: async (ctx, input) => {
        const { collection, database, document } = input as InsertOneInput;
        const mongoClient = await ctx.getClient('mongodb');
        const db = mongoClient.db(resolveDb(database, ctx.config));
        const result = await db.collection(collection).insertOne(document);
        return { insertedId: String(result.insertedId), acknowledged: result.acknowledged };
      },
    },

    updateOne: {
      isTool: false,
      description: 'Update a single document in a MongoDB collection.',
      input: UpdateOneInputSchema,
      handler: async (ctx, input) => {
        const { collection, database, filter, update, upsert } = input as UpdateOneInput;
        const mongoClient = await ctx.getClient('mongodb');
        const db = mongoClient.db(resolveDb(database, ctx.config));
        const result = await db
          .collection(collection)
          .updateOne(filter, update, { upsert: upsert ?? false });
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
      description: 'Delete a single document from a MongoDB collection.',
      input: DeleteOneInputSchema,
      handler: async (ctx, input) => {
        const { collection, database, filter } = input as DeleteOneInput;
        const mongoClient = await ctx.getClient('mongodb');
        const db = mongoClient.db(resolveDb(database, ctx.config));
        const result = await db.collection(collection).deleteOne(filter);
        return { deletedCount: result.deletedCount, acknowledged: result.acknowledged };
      },
    },
  },
};
