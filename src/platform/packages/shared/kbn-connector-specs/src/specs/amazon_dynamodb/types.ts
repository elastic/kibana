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
// Bounds
// =============================================================================

// DynamoDB limits expression strings (key condition, filter, projection, condition) to 4 KB.
const MAX_EXPRESSION_LENGTH = 4096;
// DynamoDB limits an item to 400 KB; the same cap is applied to any value map that can carry one.
const MAX_ITEM_BYTES = 400 * 1024;
// A primary key holds a partition key value (up to 2048 bytes) and an optional sort key value (up to
// 1024 bytes), so this sits above any valid key or pagination token.
const MAX_KEY_BYTES = 8 * 1024;
// DynamoDB documents no entry cap and a much larger attribute name limit (64 KB); these sit well above
// any realistic request.
const MAX_ATTRIBUTE_NAME_LENGTH = 1024;
const MAX_MAP_ENTRIES = 1000;
// Without a limit DynamoDB returns up to 1 MB of items, whose typed JSON can exceed the Actions
// maximum response size, so query and scan page by default.
const DEFAULT_ITEM_LIMIT = 100;

const isWithinBytes = (value: unknown, maxBytes: number): boolean => {
  try {
    const serialized = JSON.stringify(value);
    return serialized !== undefined && Buffer.byteLength(serialized, 'utf8') <= maxBytes;
  } catch {
    // A cycle or a BigInt cannot be serialized for the request.
    return false;
  }
};

const hasAtMostEntries = (value: Record<string, unknown>): boolean =>
  Object.keys(value).length <= MAX_MAP_ENTRIES;

const entryLimitMessage = { message: `Must have at most ${MAX_MAP_ENTRIES} entries` };

const tableName = () => z.string().min(3).max(255);
const indexName = () => z.string().min(3).max(255);
const expression = () => z.string().max(MAX_EXPRESSION_LENGTH);
const attributeName = () => z.string().max(MAX_ATTRIBUTE_NAME_LENGTH);

/** A map of attribute name to DynamoDB typed value, capped by serialized size and entry count. */
const attributeValueMap = (maxBytes: number) =>
  z
    .record(attributeName(), z.unknown())
    .refine(hasAtMostEntries, entryLimitMessage)
    .refine((value) => isWithinBytes(value, maxBytes), {
      message: `Must be serializable to JSON and at most ${maxBytes} bytes`,
    });

/** A map of expression attribute name placeholder to attribute name. */
const attributeNameMap = () =>
  z.record(attributeName(), attributeName()).refine(hasAtMostEntries, entryLimitMessage);

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
    exclusiveStartTableName: tableName()
      .optional()
      .describe(
        'The table name to start pagination from. Pass the value of lastEvaluatedTableName from a previous response to get the next page of results.'
      ),
  })
);
export type ListTablesInput = z.infer<typeof ListTablesInputSchema>;

export const DescribeTableInputSchema = lazySchema(() =>
  z.object({
    tableName: tableName().describe(
      'The name of the DynamoDB table to describe. Example: "users".'
    ),
  })
);
export type DescribeTableInput = z.infer<typeof DescribeTableInputSchema>;

export const GetItemInputSchema = lazySchema(() =>
  z.object({
    tableName: tableName().describe(
      'The name of the DynamoDB table to read from. Example: "users".'
    ),
    key: attributeValueMap(MAX_KEY_BYTES).describe(
      'The primary key of the item to retrieve, as a map of attribute name to DynamoDB typed value. ' +
        'Each value must be a DynamoDB AttributeValue object, e.g. {"userId": {"S": "user-123"}} for a string, ' +
        'or {"userId": {"S": "user-123"}, "createdAt": {"N": "1700000000"}} for a composite key. ' +
        'Type codes: "S" (string), "N" (number as string), "B" (base64 binary), "BOOL" (boolean), "NULL" (null), ' +
        '"L" (list), "M" (map), "SS" (string set), "NS" (number set), "BS" (binary set).'
    ),
    projectionExpression: expression()
      .optional()
      .describe(
        'A comma-separated list of attribute names to return. Limits the response to only the specified attributes. ' +
          'Example: "userId, name, email". Use this to reduce response size. Maximum 4096 characters.'
      ),
  })
);
export type GetItemInput = z.infer<typeof GetItemInputSchema>;

export const QueryInputSchema = lazySchema(() =>
  z.object({
    tableName: tableName().describe('The name of the DynamoDB table to query. Example: "orders".'),
    keyConditionExpression: expression().describe(
      'A condition expression for the key attributes. The partition key must be specified with "=" comparison. ' +
        'A sort key condition is optional. Example: "userId = :uid AND createdAt > :ts". ' +
        'Use expression attribute names (#name) for reserved words and values (:val) for values. Maximum 4096 characters.'
    ),
    expressionAttributeValues: attributeValueMap(MAX_ITEM_BYTES).describe(
      'A map of expression attribute value placeholders (starting with ":") to their DynamoDB typed values. ' +
        'Example: {":uid": {"S": "user-123"}, ":ts": {"N": "1700000000"}}.'
    ),
    expressionAttributeNames: attributeNameMap()
      .optional()
      .describe(
        'A map of expression attribute name placeholders (starting with "#") to actual attribute names. ' +
          'Required when an attribute name conflicts with a DynamoDB reserved word. ' +
          'Example: {"#n": "name", "#s": "status"}.'
      ),
    filterExpression: expression()
      .optional()
      .describe(
        'A filter expression applied after the query, before returning results. ' +
          'Note: filtered-out items still count against consumed capacity. ' +
          'Example: "#s = :active" with expressionAttributeNames {"#s": "status"} and expressionAttributeValues {":active": {"S": "active"}}. ' +
          'Maximum 4096 characters.'
      ),
    projectionExpression: expression()
      .optional()
      .describe(
        'A comma-separated list of attribute names to return. Example: "orderId, userId, totalAmount". Maximum 4096 characters.'
      ),
    indexName: indexName()
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
      .default(DEFAULT_ITEM_LIMIT)
      .describe(
        `Maximum number of items to evaluate before applying the filter (default ${DEFAULT_ITEM_LIMIT}). The actual number of returned items may be less. ` +
          'Use with lastEvaluatedKey for pagination.'
      ),
    exclusiveStartKey: attributeValueMap(MAX_KEY_BYTES)
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
    tableName: tableName().describe(
      'The name of the DynamoDB table to scan. WARNING: Scan reads every item in the table and is expensive for large tables. Prefer query when possible. Example: "products".'
    ),
    filterExpression: expression()
      .optional()
      .describe(
        'A filter expression applied after the scan to reduce returned items. ' +
          'Note: filtered items still consume read capacity. ' +
          'Example: "category = :cat" with expressionAttributeValues {":cat": {"S": "electronics"}}. ' +
          'Maximum 4096 characters.'
      ),
    expressionAttributeValues: attributeValueMap(MAX_ITEM_BYTES)
      .optional()
      .describe(
        'A map of expression attribute value placeholders to their DynamoDB typed values. ' +
          'Required when using filterExpression. Example: {":cat": {"S": "electronics"}}.'
      ),
    expressionAttributeNames: attributeNameMap()
      .optional()
      .describe(
        'A map of expression attribute name placeholders to actual attribute names. ' +
          'Required when an attribute name conflicts with a DynamoDB reserved word. ' +
          'Example: {"#s": "status"}.'
      ),
    projectionExpression: expression()
      .optional()
      .describe(
        'A comma-separated list of attribute names to return. Example: "productId, name, price". Maximum 4096 characters.'
      ),
    indexName: indexName()
      .optional()
      .describe(
        'The name of a GSI or LSI to scan instead of the table. Example: "category-index".'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .optional()
      .default(DEFAULT_ITEM_LIMIT)
      .describe(
        `Maximum number of items to evaluate (default ${DEFAULT_ITEM_LIMIT}). The actual number returned may be less after filtering. ` +
          'Use with lastEvaluatedKey for pagination.'
      ),
    exclusiveStartKey: attributeValueMap(MAX_KEY_BYTES)
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
    tableName: tableName().describe(
      'The name of the DynamoDB table to write to. Example: "users".'
    ),
    item: attributeValueMap(MAX_ITEM_BYTES).describe(
      'The item to put into the table as a map of attribute name to DynamoDB typed value. ' +
        'Must include all primary key attributes. If an item with the same key exists, it will be replaced. ' +
        'Maximum 400 KB. ' +
        'Example: {"userId": {"S": "user-123"}, "name": {"S": "Alice"}, "age": {"N": "30"}}. ' +
        'Type codes: "S" (string), "N" (number as string), "B" (base64 binary), "BOOL" (boolean), "NULL" (null), ' +
        '"L" (list), "M" (map), "SS" (string set), "NS" (number set), "BS" (binary set).'
    ),
    conditionExpression: expression()
      .optional()
      .describe(
        'An optional condition that must be met for the write to succeed. ' +
          'Example: "attribute_not_exists(userId)" to only write if the item does not already exist. ' +
          'Maximum 4096 characters.'
      ),
    expressionAttributeValues: attributeValueMap(MAX_ITEM_BYTES)
      .optional()
      .describe(
        'A map of expression attribute value placeholders for the conditionExpression. ' +
          'Example: {":val": {"S": "expected"}}.'
      ),
    expressionAttributeNames: attributeNameMap()
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
    tableName: tableName().describe(
      'The name of the DynamoDB table to delete from. Example: "sessions".'
    ),
    key: attributeValueMap(MAX_KEY_BYTES).describe(
      'The primary key of the item to delete, as a map of attribute name to DynamoDB typed value. ' +
        'Must include all primary key attributes. ' +
        'Example: {"sessionId": {"S": "sess-abc-123"}}.'
    ),
    conditionExpression: expression()
      .optional()
      .describe(
        'An optional condition that must be met for the delete to succeed. ' +
          'Example: "userId = :uid" to only delete if the item belongs to the specified user. ' +
          'Maximum 4096 characters.'
      ),
    expressionAttributeValues: attributeValueMap(MAX_ITEM_BYTES)
      .optional()
      .describe(
        'A map of expression attribute value placeholders for the conditionExpression. ' +
          'Example: {":uid": {"S": "user-123"}}.'
      ),
    expressionAttributeNames: attributeNameMap()
      .optional()
      .describe(
        'A map of expression attribute name placeholders for the conditionExpression. ' +
          'Required when attribute names conflict with DynamoDB reserved words.'
      ),
  })
);
export type DeleteItemInput = z.infer<typeof DeleteItemInputSchema>;
