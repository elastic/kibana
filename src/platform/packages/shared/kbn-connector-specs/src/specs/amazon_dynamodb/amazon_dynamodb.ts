/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Amazon DynamoDB Connector
 *
 * Provides DynamoDB table and item operations:
 * - List tables and describe table schema
 * - Get, query, and scan items
 * - Put and delete items
 *
 * Authentication uses the aws_credentials auth type which stores
 * Access Key ID and Secret Access Key as encrypted secrets and
 * signs requests automatically via an Axios SigV4 interceptor.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import type {
  ListTablesInput,
  DescribeTableInput,
  GetItemInput,
  QueryInput,
  ScanInput,
  PutItemInput,
  DeleteItemInput,
} from './types';
import {
  ListTablesInputSchema,
  DescribeTableInputSchema,
  GetItemInputSchema,
  QueryInputSchema,
  ScanInputSchema,
  PutItemInputSchema,
  DeleteItemInputSchema,
} from './types';

// =============================================================================
// DynamoDB API helpers
// =============================================================================

/**
 * Make an authenticated POST request to the DynamoDB API.
 * SigV4 signing is handled transparently by the aws_credentials auth interceptor.
 */
async function callDynamoDbApi(
  ctx: ActionContext,
  target: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { region } = ctx.config as { region: string };
  const url = `https://dynamodb.${region}.amazonaws.com/`;

  try {
    const response = await ctx.client.post(url, JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/x-amz-json-1.0',
        'X-Amz-Target': `DynamoDB_20120810.${target}`,
      },
    });

    return response.data as Record<string, unknown>;
  } catch (error: unknown) {
    const err = error as {
      response?: {
        status?: number;
        statusText?: string;
        data?: unknown;
      };
    };

    if (err.response?.status === 401) {
      throw new Error('Authentication failed. Please check your AWS credentials.');
    } else if (err.response?.status === 403) {
      throw new Error(
        'Access denied. Your AWS IAM credentials lack the required permissions for this DynamoDB operation.'
      );
    } else if (err.response?.data && typeof err.response.data === 'object') {
      const data = err.response.data as Record<string, unknown>;
      const code = (data.__type as string) || (data.code as string) || 'UnknownError';
      const message =
        (data.message as string) || (data.Message as string) || 'An unknown error occurred';
      throw new Error(`AWS DynamoDB Error [${code}]: ${message}`);
    } else {
      throw new Error(
        `AWS DynamoDB API request failed: ${err.response?.statusText || (error as Error).message}`
      );
    }
  }
}

// =============================================================================
// Connector spec
// =============================================================================

export const AmazonDynamoDB: ConnectorSpec = {
  metadata: {
    id: '.amazon_dynamodb',
    displayName: 'Amazon DynamoDB',
    description: i18n.translate('connectorSpecs.amazonDynamoDB.metadata.description', {
      defaultMessage: 'List tables, query, scan, and manage items in Amazon DynamoDB',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: ['aws_credentials', 'aws_iam_role'],
  },

  schema: lazySchema(() =>
    z.object({
      region: z
        .string()
        .regex(/^[a-z][a-z0-9-]+-\d+$/, {
          message:
            'Must be a valid AWS region identifier (e.g. us-east-1, eu-west-2, us-gov-east-1)',
        })
        .describe(
          i18n.translate('connectorSpecs.amazonDynamoDB.config.region', {
            defaultMessage: 'AWS Region where the DynamoDB tables are located (e.g., us-east-1)',
          })
        )
        .meta({
          widget: 'text',
          label: i18n.translate('connectorSpecs.amazonDynamoDB.config.region.label', {
            defaultMessage: 'AWS Region',
          }),
          placeholder: 'us-east-1',
          helpText: i18n.translate('connectorSpecs.amazonDynamoDB.config.region.helpText', {
            defaultMessage:
              'The AWS Region where your DynamoDB tables are located. Example: us-east-1, eu-west-1.',
          }),
        }),
    })
  ),

  actions: {
    listTables: {
      isTool: true,
      description:
        'List the names of DynamoDB tables in the configured region. ' +
        'Use this to discover available tables before describing or querying them. ' +
        'Returns up to 20 table names per page; use lastEvaluatedTableName for pagination.',
      input: ListTablesInputSchema,
      handler: async (ctx, input: ListTablesInput) => {
        const body: Record<string, unknown> = {};
        if (input.limit !== undefined) {
          body.Limit = input.limit;
        }
        if (input.exclusiveStartTableName) {
          body.ExclusiveStartTableName = input.exclusiveStartTableName;
        }

        const data = await callDynamoDbApi(ctx, 'ListTables', body);

        return {
          tableNames: (data.TableNames as string[]) || [],
          lastEvaluatedTableName: (data.LastEvaluatedTableName as string) || null,
        };
      },
    },

    describeTable: {
      isTool: true,
      description:
        'Retrieve the full schema and metadata of a specific DynamoDB table, including its primary key definition (partition key and optional sort key), Global Secondary Indexes (GSIs), Local Secondary Indexes (LSIs), billing mode, and item count. ' +
        'Use this before querying to understand what keys and indexes are available.',
      input: DescribeTableInputSchema,
      handler: async (ctx, input: DescribeTableInput) => {
        const data = await callDynamoDbApi(ctx, 'DescribeTable', { TableName: input.tableName });
        const table = (data.Table as Record<string, unknown>) || {};

        return {
          tableName: table.TableName,
          tableStatus: table.TableStatus,
          itemCount: table.ItemCount,
          tableSizeBytes: table.TableSizeBytes,
          billingMode: (table.BillingModeSummary as Record<string, unknown> | undefined)
            ?.BillingMode,
          keySchema: table.KeySchema,
          attributeDefinitions: table.AttributeDefinitions,
          globalSecondaryIndexes: table.GlobalSecondaryIndexes || [],
          localSecondaryIndexes: table.LocalSecondaryIndexes || [],
          creationDateTime: table.CreationDateTime,
        };
      },
    },

    getItem: {
      isTool: true,
      description:
        'Retrieve a single item from a DynamoDB table by its exact primary key. ' +
        'Returns the full item (or specified attributes if projectionExpression is set). ' +
        'Returns null if no item exists with the given key. ' +
        'Use this when you know the exact key; use query or scan for key-range or filter operations.',
      input: GetItemInputSchema,
      handler: async (ctx, input: GetItemInput) => {
        const body: Record<string, unknown> = {
          TableName: input.tableName,
          Key: input.key,
        };
        if (input.projectionExpression) {
          body.ProjectionExpression = input.projectionExpression;
        }

        const data = await callDynamoDbApi(ctx, 'GetItem', body);

        return {
          item: (data.Item as Record<string, unknown>) || null,
          found: !!data.Item,
        };
      },
    },

    query: {
      isTool: true,
      description:
        'Query a DynamoDB table or index using a key condition expression. ' +
        'The partition key must be specified with "=" comparison; the sort key is optional. ' +
        'Queries are efficient and read only the items that match the key condition. ' +
        'Use describeTable first to learn the available keys and indexes. ' +
        'Returns items, count, and a lastEvaluatedKey for pagination. ' +
        'Prefer this over scan for all key-based access patterns.',
      input: QueryInputSchema,
      handler: async (ctx, input: QueryInput) => {
        const body: Record<string, unknown> = {
          TableName: input.tableName,
          KeyConditionExpression: input.keyConditionExpression,
          ExpressionAttributeValues: input.expressionAttributeValues,
        };
        if (input.expressionAttributeNames) {
          body.ExpressionAttributeNames = input.expressionAttributeNames;
        }
        if (input.filterExpression) {
          body.FilterExpression = input.filterExpression;
        }
        if (input.projectionExpression) {
          body.ProjectionExpression = input.projectionExpression;
        }
        if (input.indexName) {
          body.IndexName = input.indexName;
        }
        if (input.limit !== undefined) {
          body.Limit = input.limit;
        }
        if (input.exclusiveStartKey) {
          body.ExclusiveStartKey = input.exclusiveStartKey;
        }
        if (input.scanIndexForward !== undefined) {
          body.ScanIndexForward = input.scanIndexForward;
        }
        if (input.select) {
          body.Select = input.select;
        }

        const data = await callDynamoDbApi(ctx, 'Query', body);

        return {
          items: (data.Items as Array<Record<string, unknown>>) || [],
          count: (data.Count as number) || 0,
          scannedCount: (data.ScannedCount as number) || 0,
          lastEvaluatedKey: (data.LastEvaluatedKey as Record<string, unknown>) || null,
        };
      },
    },

    scan: {
      isTool: true,
      description:
        'Scan an entire DynamoDB table or index, optionally filtering results. ' +
        'WARNING: Scan reads every item in the table and consumes significant read capacity on large tables. ' +
        'Use query instead whenever the access pattern supports a key condition. ' +
        'Only use scan for small tables, full exports, or when no key condition is possible. ' +
        'Returns items, count, and a lastEvaluatedKey for pagination.',
      input: ScanInputSchema,
      handler: async (ctx, input: ScanInput) => {
        const body: Record<string, unknown> = {
          TableName: input.tableName,
        };
        if (input.filterExpression) {
          body.FilterExpression = input.filterExpression;
        }
        if (input.expressionAttributeValues) {
          body.ExpressionAttributeValues = input.expressionAttributeValues;
        }
        if (input.expressionAttributeNames) {
          body.ExpressionAttributeNames = input.expressionAttributeNames;
        }
        if (input.projectionExpression) {
          body.ProjectionExpression = input.projectionExpression;
        }
        if (input.indexName) {
          body.IndexName = input.indexName;
        }
        if (input.limit !== undefined) {
          body.Limit = input.limit;
        }
        if (input.exclusiveStartKey) {
          body.ExclusiveStartKey = input.exclusiveStartKey;
        }
        if (input.select) {
          body.Select = input.select;
        }

        const data = await callDynamoDbApi(ctx, 'Scan', body);

        return {
          items: (data.Items as Array<Record<string, unknown>>) || [],
          count: (data.Count as number) || 0,
          scannedCount: (data.ScannedCount as number) || 0,
          lastEvaluatedKey: (data.LastEvaluatedKey as Record<string, unknown>) || null,
        };
      },
    },

    putItem: {
      isTool: true,
      description:
        'Write a single item to a DynamoDB table. ' +
        'If an item with the same primary key already exists, it is fully replaced. ' +
        'Use conditionExpression to make this a conditional write — for example, ' +
        '"attribute_not_exists(pk)" to only insert if the item does not already exist. ' +
        'Returns an empty result on success.',
      input: PutItemInputSchema,
      handler: async (ctx, input: PutItemInput) => {
        const body: Record<string, unknown> = {
          TableName: input.tableName,
          Item: input.item,
        };
        if (input.conditionExpression) {
          body.ConditionExpression = input.conditionExpression;
        }
        if (input.expressionAttributeValues) {
          body.ExpressionAttributeValues = input.expressionAttributeValues;
        }
        if (input.expressionAttributeNames) {
          body.ExpressionAttributeNames = input.expressionAttributeNames;
        }

        await callDynamoDbApi(ctx, 'PutItem', body);

        return { ok: true };
      },
    },

    deleteItem: {
      isTool: true,
      description:
        'Delete a single item from a DynamoDB table by its primary key. ' +
        'Use conditionExpression to make this a conditional delete — for example, ' +
        '"userId = :uid" to ensure only the owning user can delete the item. ' +
        'Returns an empty result on success. No error is raised if the item did not exist.',
      input: DeleteItemInputSchema,
      handler: async (ctx, input: DeleteItemInput) => {
        const body: Record<string, unknown> = {
          TableName: input.tableName,
          Key: input.key,
        };
        if (input.conditionExpression) {
          body.ConditionExpression = input.conditionExpression;
        }
        if (input.expressionAttributeValues) {
          body.ExpressionAttributeValues = input.expressionAttributeValues;
        }
        if (input.expressionAttributeNames) {
          body.ExpressionAttributeNames = input.expressionAttributeNames;
        }

        await callDynamoDbApi(ctx, 'DeleteItem', body);

        return { ok: true };
      },
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.amazonDynamoDB.test.description', {
      defaultMessage: 'Verifies the AWS DynamoDB connection by listing tables',
    }),
    handler: async (ctx) => {
      try {
        await callDynamoDbApi(ctx, 'ListTables', { Limit: 1 });
        return {
          ok: true,
          message: 'Successfully connected to Amazon DynamoDB',
        };
      } catch (error) {
        return {
          ok: false,
          message: `Failed to connect: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  },

  skill: [
    '## Amazon DynamoDB Connector',
    '',
    '### Typical workflow',
    '1. Call `listTables` to discover available table names.',
    '2. Call `describeTable` to learn the primary key attributes, indexes, and attribute definitions.',
    '3. Use `query` (preferred) or `scan` to find items.',
    '4. Use `getItem` to fetch a specific item by its exact primary key.',
    '',
    '### query vs. scan',
    'Prefer `query` whenever you have the partition key value — it reads only matching items.',
    'Only fall back to `scan` when no key condition is possible (e.g. filtering by a non-key attribute with no relevant GSI).',
    '',
    '### Pagination',
    '`query` and `scan` return `lastEvaluatedKey`; pass it as `exclusiveStartKey` in the next call.',
    '`listTables` uses different field names: `lastEvaluatedTableName` / `exclusiveStartTableName`.',
  ].join('\n'),
};
