/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { AmazonDynamoDB } from './amazon_dynamodb';

describe('AmazonDynamoDB', () => {
  const mockPost = jest.fn();

  const mockContext = {
    client: {
      post: mockPost,
    },
    config: {
      region: 'us-east-1',
    },
    secrets: {
      authType: 'aws_credentials',
      accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
      secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    },
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // listTables
  // ===========================================================================

  describe('listTables', () => {
    it('should list tables with default limit', async () => {
      mockPost.mockResolvedValue({
        data: {
          TableNames: ['users', 'orders', 'products'],
          LastEvaluatedTableName: null,
        },
      });

      const result = await AmazonDynamoDB.actions.listTables.handler(mockContext, {});

      expect(mockPost).toHaveBeenCalledWith(
        'https://dynamodb.us-east-1.amazonaws.com/',
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Amz-Target': 'DynamoDB_20120810.ListTables',
          }),
        })
      );
      expect(result.tableNames).toEqual(['users', 'orders', 'products']);
      expect(result.lastEvaluatedTableName).toBeNull();
    });

    it('should list tables with pagination', async () => {
      mockPost.mockResolvedValue({
        data: {
          TableNames: ['aaa', 'bbb'],
          LastEvaluatedTableName: 'bbb',
        },
      });

      const result = await AmazonDynamoDB.actions.listTables.handler(mockContext, {
        limit: 2,
      });

      expect(result.tableNames).toEqual(['aaa', 'bbb']);
      expect(result.lastEvaluatedTableName).toBe('bbb');
    });

    it('should pass exclusiveStartTableName for pagination', async () => {
      mockPost.mockResolvedValue({
        data: {
          TableNames: ['ccc'],
          LastEvaluatedTableName: null,
        },
      });

      const result = await AmazonDynamoDB.actions.listTables.handler(mockContext, {
        exclusiveStartTableName: 'bbb',
      });

      const body = JSON.parse(mockPost.mock.calls[0][1]);
      expect(body.ExclusiveStartTableName).toBe('bbb');
      expect(result.tableNames).toEqual(['ccc']);
    });
  });

  // ===========================================================================
  // describeTable
  // ===========================================================================

  describe('describeTable', () => {
    it('should describe a table and return key schema and indexes', async () => {
      mockPost.mockResolvedValue({
        data: {
          Table: {
            TableName: 'users',
            TableStatus: 'ACTIVE',
            ItemCount: 1000,
            TableSizeBytes: 52000,
            KeySchema: [{ AttributeName: 'userId', KeyType: 'HASH' }],
            AttributeDefinitions: [{ AttributeName: 'userId', AttributeType: 'S' }],
            GlobalSecondaryIndexes: [],
            LocalSecondaryIndexes: [],
            BillingModeSummary: { BillingMode: 'PAY_PER_REQUEST' },
            CreationDateTime: 1700000000,
          },
        },
      });

      const result = await AmazonDynamoDB.actions.describeTable.handler(mockContext, {
        tableName: 'users',
      });

      expect(result.tableName).toBe('users');
      expect(result.tableStatus).toBe('ACTIVE');
      expect(result.itemCount).toBe(1000);
      expect(result.keySchema).toEqual([{ AttributeName: 'userId', KeyType: 'HASH' }]);
      expect(result.billingMode).toBe('PAY_PER_REQUEST');
      expect(result.globalSecondaryIndexes).toEqual([]);
    });
  });

  // ===========================================================================
  // getItem
  // ===========================================================================

  describe('getItem', () => {
    it('should return an item when found', async () => {
      mockPost.mockResolvedValue({
        data: {
          Item: {
            userId: { S: 'user-123' },
            name: { S: 'Alice' },
            age: { N: '30' },
          },
        },
      });

      const result = await AmazonDynamoDB.actions.getItem.handler(mockContext, {
        tableName: 'users',
        key: { userId: { S: 'user-123' } },
      });

      expect(result.found).toBe(true);
      expect(result.item).toEqual({
        userId: { S: 'user-123' },
        name: { S: 'Alice' },
        age: { N: '30' },
      });
    });

    it('should return null item when not found', async () => {
      mockPost.mockResolvedValue({ data: {} });

      const result = await AmazonDynamoDB.actions.getItem.handler(mockContext, {
        tableName: 'users',
        key: { userId: { S: 'user-999' } },
      });

      expect(result.found).toBe(false);
      expect(result.item).toBeNull();
    });

    it('should pass projectionExpression when provided', async () => {
      mockPost.mockResolvedValue({
        data: {
          Item: { userId: { S: 'user-123' }, name: { S: 'Alice' } },
        },
      });

      await AmazonDynamoDB.actions.getItem.handler(mockContext, {
        tableName: 'users',
        key: { userId: { S: 'user-123' } },
        projectionExpression: 'userId, name',
      });

      const body = JSON.parse(mockPost.mock.calls[0][1]);
      expect(body.ProjectionExpression).toBe('userId, name');
    });
  });

  // ===========================================================================
  // query
  // ===========================================================================

  describe('query', () => {
    it('should query items by key condition', async () => {
      mockPost.mockResolvedValue({
        data: {
          Items: [{ orderId: { S: 'order-1' }, userId: { S: 'user-123' }, total: { N: '99.99' } }],
          Count: 1,
          ScannedCount: 1,
          LastEvaluatedKey: null,
        },
      });

      const result = await AmazonDynamoDB.actions.query.handler(mockContext, {
        tableName: 'orders',
        keyConditionExpression: 'userId = :uid',
        expressionAttributeValues: { ':uid': { S: 'user-123' } },
      });

      expect(result.count).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].orderId).toEqual({ S: 'order-1' });
      expect(result.lastEvaluatedKey).toBeNull();
    });

    it('should pass optional query parameters', async () => {
      mockPost.mockResolvedValue({
        data: { Items: [], Count: 0, ScannedCount: 0, LastEvaluatedKey: null },
      });

      await AmazonDynamoDB.actions.query.handler(mockContext, {
        tableName: 'orders',
        keyConditionExpression: 'userId = :uid',
        expressionAttributeValues: { ':uid': { S: 'user-123' } },
        indexName: 'userId-createdAt-index',
        limit: 10,
        scanIndexForward: false,
        filterExpression: '#s = :active',
        expressionAttributeNames: { '#s': 'status' },
      });

      const body = JSON.parse(mockPost.mock.calls[0][1]);
      expect(body.IndexName).toBe('userId-createdAt-index');
      expect(body.Limit).toBe(10);
      expect(body.ScanIndexForward).toBe(false);
      expect(body.FilterExpression).toBe('#s = :active');
      expect(body.ExpressionAttributeNames).toEqual({ '#s': 'status' });
    });

    it('should pass exclusiveStartKey for pagination', async () => {
      mockPost.mockResolvedValue({
        data: { Items: [], Count: 0, ScannedCount: 0, LastEvaluatedKey: null },
      });

      await AmazonDynamoDB.actions.query.handler(mockContext, {
        tableName: 'orders',
        keyConditionExpression: 'userId = :uid',
        expressionAttributeValues: { ':uid': { S: 'user-123' } },
        exclusiveStartKey: { userId: { S: 'user-123' }, orderId: { S: 'order-5' } },
      });

      const body = JSON.parse(mockPost.mock.calls[0][1]);
      expect(body.ExclusiveStartKey).toEqual({
        userId: { S: 'user-123' },
        orderId: { S: 'order-5' },
      });
    });
  });

  // ===========================================================================
  // scan
  // ===========================================================================

  describe('scan', () => {
    it('should scan a table and return items', async () => {
      mockPost.mockResolvedValue({
        data: {
          Items: [
            { productId: { S: 'prod-1' }, category: { S: 'electronics' } },
            { productId: { S: 'prod-2' }, category: { S: 'books' } },
          ],
          Count: 2,
          ScannedCount: 50,
          LastEvaluatedKey: { productId: { S: 'prod-2' } },
        },
      });

      const result = await AmazonDynamoDB.actions.scan.handler(mockContext, {
        tableName: 'products',
      });

      const body = JSON.parse(mockPost.mock.calls[0][1]);
      expect(body.TableName).toBe('products');
      expect(result.count).toBe(2);
      expect(result.scannedCount).toBe(50);
      expect(result.items).toHaveLength(2);
      expect(result.lastEvaluatedKey).toEqual({ productId: { S: 'prod-2' } });
    });

    it('should pass filterExpression and expressionAttributeValues', async () => {
      mockPost.mockResolvedValue({
        data: { Items: [], Count: 0, ScannedCount: 0, LastEvaluatedKey: null },
      });

      await AmazonDynamoDB.actions.scan.handler(mockContext, {
        tableName: 'products',
        filterExpression: 'category = :cat',
        expressionAttributeValues: { ':cat': { S: 'electronics' } },
      });

      const body = JSON.parse(mockPost.mock.calls[0][1]);
      expect(body.FilterExpression).toBe('category = :cat');
      expect(body.ExpressionAttributeValues).toEqual({ ':cat': { S: 'electronics' } });
    });
  });

  // ===========================================================================
  // putItem
  // ===========================================================================

  describe('putItem', () => {
    it('should put an item and return ok', async () => {
      mockPost.mockResolvedValue({ data: {} });

      const result = await AmazonDynamoDB.actions.putItem.handler(mockContext, {
        tableName: 'users',
        item: {
          userId: { S: 'user-456' },
          name: { S: 'Bob' },
          age: { N: '25' },
        },
      });

      const body = JSON.parse(mockPost.mock.calls[0][1]);
      expect(body.TableName).toBe('users');
      expect(body.Item.userId).toEqual({ S: 'user-456' });
      expect(result).toEqual({ ok: true });
    });

    it('should include conditionExpression when provided', async () => {
      mockPost.mockResolvedValue({ data: {} });

      await AmazonDynamoDB.actions.putItem.handler(mockContext, {
        tableName: 'users',
        item: { userId: { S: 'user-789' }, name: { S: 'Carol' } },
        conditionExpression: 'attribute_not_exists(userId)',
      });

      const body = JSON.parse(mockPost.mock.calls[0][1]);
      expect(body.ConditionExpression).toBe('attribute_not_exists(userId)');
    });
  });

  // ===========================================================================
  // deleteItem
  // ===========================================================================

  describe('deleteItem', () => {
    it('should delete an item and return ok', async () => {
      mockPost.mockResolvedValue({ data: {} });

      const result = await AmazonDynamoDB.actions.deleteItem.handler(mockContext, {
        tableName: 'sessions',
        key: { sessionId: { S: 'sess-abc-123' } },
      });

      const body = JSON.parse(mockPost.mock.calls[0][1]);
      expect(body.TableName).toBe('sessions');
      expect(body.Key).toEqual({ sessionId: { S: 'sess-abc-123' } });
      expect(result).toEqual({ ok: true });
    });

    it('should include conditionExpression when provided', async () => {
      mockPost.mockResolvedValue({ data: {} });

      await AmazonDynamoDB.actions.deleteItem.handler(mockContext, {
        tableName: 'sessions',
        key: { sessionId: { S: 'sess-abc-123' } },
        conditionExpression: 'userId = :uid',
        expressionAttributeValues: { ':uid': { S: 'user-123' } },
      });

      const body = JSON.parse(mockPost.mock.calls[0][1]);
      expect(body.ConditionExpression).toBe('userId = :uid');
      expect(body.ExpressionAttributeValues).toEqual({ ':uid': { S: 'user-123' } });
    });
  });

  // ===========================================================================
  // test handler
  // ===========================================================================

  describe('test handler', () => {
    it('should return ok when connection succeeds', async () => {
      mockPost.mockResolvedValue({ data: { TableNames: [] } });

      const result = await AmazonDynamoDB.test.handler(mockContext);

      expect(result.ok).toBe(true);
      expect(result.message).toContain('Successfully');
    });

    it('should return error when connection fails', async () => {
      mockPost.mockRejectedValue(new Error('Connection refused'));

      const result = await AmazonDynamoDB.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Connection refused');
    });
  });

  // ===========================================================================
  // region validation (SSRF prevention)
  // ===========================================================================

  describe('region validation', () => {
    const validRegions = [
      'us-east-1',
      'eu-west-2',
      'ap-southeast-1',
      'ca-central-1',
      'us-gov-east-1',
      'us-iso-east-1',
      'me-south-1',
      'af-south-1',
      'il-central-1',
    ];

    const invalidRegions = [
      'us-east-1.evil.com',
      'us-east-1.evil.com#',
      'user@evil.com',
      'us-east-1/../../etc/passwd',
      'us-east-1?foo=bar',
      '',
      'UPPERCASE-1',
    ];

    it.each(validRegions)('accepts valid region: %s', (region) => {
      const result = AmazonDynamoDB.schema.safeParse({ region });
      expect(result.success).toBe(true);
    });

    it.each(invalidRegions)('rejects invalid region: %s', (region) => {
      const result = AmazonDynamoDB.schema.safeParse({ region });
      expect(result.success).toBe(false);
    });
  });

  // ===========================================================================
  // error handling
  // ===========================================================================

  describe('error handling', () => {
    it('should surface DynamoDB error type and message', async () => {
      mockPost.mockRejectedValue({
        response: {
          status: 400,
          data: {
            __type: 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException',
            message: 'Requested resource not found: Table: nonexistent not found',
          },
        },
      });

      await expect(
        AmazonDynamoDB.actions.describeTable.handler(mockContext, { tableName: 'nonexistent' })
      ).rejects.toThrow('ResourceNotFoundException');
    });

    it('should return a helpful error message for 403 responses', async () => {
      mockPost.mockRejectedValue({
        response: { status: 403, data: {} },
      });

      await expect(AmazonDynamoDB.actions.listTables.handler(mockContext, {})).rejects.toThrow(
        'Access denied'
      );
    });
  });
});
