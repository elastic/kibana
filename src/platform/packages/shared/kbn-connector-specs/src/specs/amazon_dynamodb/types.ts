/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// =============================================================================

export const ListTablesInputSchema = lazySchema(() =>
  z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe('Maximum number of table names to return per page (1–100, default 20).'),
    exclusiveStartTableName: z
      .string()
      .optional()
      .describe(
        'The table name to start pagination from. Pass the value of lastEvaluatedTableName from a previous response to get the next page of results.'
      ),
  })
);
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;

export const DescribeTableInputSchema = lazySchema(() =>
  z.object({
    tableName: z
      .string()
      .min(3)
      .max(255)
      .describe('The name of the DynamoDB table to describe. Example: "users".'),
  })
);
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;

export const GetItemInputSchema = lazySchema(() =>
  z.object({
    tableName: z
      .string()
      .min(3)
      .max(255)
      .describe('The name of the DynamoDB table to read from. Example: "users".'),
    key: z
      .record(z.string(), z.unknown())
      .describe(
        'The primary key of the item to retrieve, as a map of attribute name to DynamoDB typed value. ' +
          'Each value must be a DynamoDB AttributeValue object, e.g. {"userId": {"S": "user-123"}} for a string, ' +
          'or {"userId": {"S": "user-123"}, "createdAt": {"N": "1700000000"}} for a composite key. ' +
          'Type codes: "S" (string), "N" (number as string), "B" (base64 binary), "BOOL" (boolean), "NULL" (null), ' +
          '"L" (list), "M" (map), "SS" (string set), "NS" (number set), "BS" (binary set).'
      ),
    projectionExpression: z
      .string()
      .optional()
      .describe(
        'A comma-separated list of attribute names to return. Limits the response to only the specified attributes. ' +
          'Example: "userId, name, email". Use this to reduce response size.'
      ),
  })
);
export type GetItemInput = z.infer<typeof GetItemInputSchema>;

export const QueryInputSchema = lazySchema(() =>
  z.object({
    tableName: z
      .string()
      .min(3)
      .max(255)
      .describe('The name of the DynamoDB table to query. Example: "orders".'),
    keyConditionExpression: z
      .string()
      .describe(
        'A condition expression for the key attributes. The partition key must be specified with "=" comparison. ' +
          'A sort key condition is optional. Example: "userId = :uid AND createdAt > :ts". ' +
          'Use expression attribute names (#name) for reserved words and values (:val) for values.'
      ),
    expressionAttributeValues: z
      .record(z.string(), z.unknown())
      .describe(
        'A map of expression attribute value placeholders (starting with ":") to their DynamoDB typed values. ' +
          'Example: {":uid": {"S": "user-123"}, ":ts": {"N": "1700000000"}}.'
      ),
    expressionAttributeNames: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        'A map of expression attribute name placeholders (starting with "#") to actual attribute names. ' +
          'Required when an attribute name conflicts with a DynamoDB reserved word. ' +
          'Example: {"#n": "name", "#s": "status"}.'
      ),
    filterExpression: z
      .string()
      .optional()
      .describe(
        'A filter expression applied after the query, before returning results. ' +
          'Note: filtered-out items still count against consumed capacity. ' +
          'Example: "#s = :active" with expressionAttributeNames {"#s": "status"} and expressionAttributeValues {":active": {"S": "active"}}.'
      ),
    projectionExpression: z
      .string()
      .optional()
      .describe(
        'A comma-separated list of attribute names to return. Example: "orderId, userId, totalAmount".'
      ),
    indexName: z
      .string()
      .optional()
      .describe(
        'The name of a Global Secondary Index (GSI) or Local Secondary Index (LSI) to query. ' +
          'When omitted, the query runs against the table\'s primary key. Example: "userId-createdAt-index".'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(
        'Maximum number of items to evaluate before applying the filter. The actual number of returned items may be less. ' +
          'Use with lastEvaluatedKey for pagination.'
      ),
    exclusiveStartKey: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'The key of the first item to evaluate when paginating. ' +
          'Pass the value of lastEvaluatedKey from a previous response to get the next page.'
      ),
    scanIndexForward: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        'Sort order for items returned. true (default) = ascending by sort key, false = descending.'
      ),
    select: z
      .enum(['ALL_ATTRIBUTES', 'ALL_PROJECTED_ATTRIBUTES', 'SPECIFIC_ATTRIBUTES', 'COUNT'])
      .optional()
      .describe(
        'What to return: "ALL_ATTRIBUTES" (default), "ALL_PROJECTED_ATTRIBUTES" (index only), ' +
          '"SPECIFIC_ATTRIBUTES" (requires projectionExpression), or "COUNT" (returns only the count of matching items).'
      ),
  })
);
export type QueryInput = z.infer<typeof QueryInputSchema>;

export const ScanInputSchema = lazySchema(() =>
  z.object({
    tableName: z
      .string()
      .min(3)
      .max(255)
      .describe(
        'The name of the DynamoDB table to scan. WARNING: Scan reads every item in the table and is expensive for large tables. Prefer query when possible. Example: "products".'
      ),
    filterExpression: z
      .string()
      .optional()
      .describe(
        'A filter expression applied after the scan to reduce returned items. ' +
          'Note: filtered items still consume read capacity. ' +
          'Example: "category = :cat" with expressionAttributeValues {":cat": {"S": "electronics"}}.'
      ),
    expressionAttributeValues: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'A map of expression attribute value placeholders to their DynamoDB typed values. ' +
          'Required when using filterExpression. Example: {":cat": {"S": "electronics"}}.'
      ),
    expressionAttributeNames: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        'A map of expression attribute name placeholders to actual attribute names. ' +
          'Required when an attribute name conflicts with a DynamoDB reserved word. ' +
          'Example: {"#s": "status"}.'
      ),
    projectionExpression: z
      .string()
      .optional()
      .describe(
        'A comma-separated list of attribute names to return. Example: "productId, name, price".'
      ),
    indexName: z
      .string()
      .optional()
      .describe(
        'The name of a GSI or LSI to scan instead of the table. Example: "category-index".'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(
        'Maximum number of items to evaluate. The actual number returned may be less after filtering. ' +
          'Use with lastEvaluatedKey for pagination.'
      ),
    exclusiveStartKey: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'The key of the first item to evaluate when paginating. ' +
          'Pass the value of lastEvaluatedKey from a previous response to get the next page.'
      ),
    select: z
      .enum(['ALL_ATTRIBUTES', 'ALL_PROJECTED_ATTRIBUTES', 'SPECIFIC_ATTRIBUTES', 'COUNT'])
      .optional()
      .describe(
        'What to return: "ALL_ATTRIBUTES" (default), "ALL_PROJECTED_ATTRIBUTES" (index only), ' +
          '"SPECIFIC_ATTRIBUTES" (requires projectionExpression), or "COUNT" (returns only the count of matching items).'
      ),
  })
);
export type ScanInput = z.infer<typeof ScanInputSchema>;

export const PutItemInputSchema = lazySchema(() =>
  z.object({
    tableName: z
      .string()
      .min(3)
      .max(255)
      .describe('The name of the DynamoDB table to write to. Example: "users".'),
    item: z
      .record(z.string(), z.unknown())
      .describe(
        'The item to put into the table as a map of attribute name to DynamoDB typed value. ' +
          'Must include all primary key attributes. If an item with the same key exists, it will be replaced. ' +
          'Example: {"userId": {"S": "user-123"}, "name": {"S": "Alice"}, "age": {"N": "30"}}. ' +
          'Type codes: "S" (string), "N" (number as string), "B" (base64 binary), "BOOL" (boolean), "NULL" (null), ' +
          '"L" (list), "M" (map), "SS" (string set), "NS" (number set), "BS" (binary set).'
      ),
    conditionExpression: z
      .string()
      .optional()
      .describe(
        'An optional condition that must be met for the write to succeed. ' +
          'Example: "attribute_not_exists(userId)" to only write if the item does not already exist.'
      ),
    expressionAttributeValues: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'A map of expression attribute value placeholders for the conditionExpression. ' +
          'Example: {":val": {"S": "expected"}}.'
      ),
    expressionAttributeNames: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        'A map of expression attribute name placeholders for the conditionExpression. ' +
          'Required when attribute names conflict with DynamoDB reserved words.'
      ),
  })
);
export type PutItemInput = z.infer<typeof PutItemInputSchema>;

export const DeleteItemInputSchema = lazySchema(() =>
  z.object({
    tableName: z
      .string()
      .min(3)
      .max(255)
      .describe('The name of the DynamoDB table to delete from. Example: "sessions".'),
    key: z
      .record(z.string(), z.unknown())
      .describe(
        'The primary key of the item to delete, as a map of attribute name to DynamoDB typed value. ' +
          'Must include all primary key attributes. ' +
          'Example: {"sessionId": {"S": "sess-abc-123"}}.'
      ),
    conditionExpression: z
      .string()
      .optional()
      .describe(
        'An optional condition that must be met for the delete to succeed. ' +
          'Example: "userId = :uid" to only delete if the item belongs to the specified user.'
      ),
    expressionAttributeValues: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        'A map of expression attribute value placeholders for the conditionExpression. ' +
          'Example: {":uid": {"S": "user-123"}}.'
      ),
    expressionAttributeNames: z
      .record(z.string(), z.string())
      .optional()
      .describe(
        'A map of expression attribute name placeholders for the conditionExpression. ' +
          'Required when attribute names conflict with DynamoDB reserved words.'
      ),
  })
);
export type DeleteItemInput = z.infer<typeof DeleteItemInputSchema>;
