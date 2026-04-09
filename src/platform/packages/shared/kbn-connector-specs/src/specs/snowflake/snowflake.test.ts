/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { Snowflake } from './snowflake';

const ACCOUNT_URL = 'https://myorg-myaccount.snowflakecomputing.com';

describe('Snowflake', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const baseConfig = {
    accountUrl: ACCOUNT_URL,
    warehouse: 'COMPUTE_WH',
    database: 'PROD_DB',
    defaultSchema: 'PUBLIC',
    role: 'ANALYST',
  };

  const mockContext = {
    client: mockClient,
    config: baseConfig,
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct connector id', () => {
      expect(Snowflake.metadata.id).toBe('.snowflake');
    });

    it('should support workflows and agentBuilder features', () => {
      expect(Snowflake.metadata.supportedFeatureIds).toContain('workflows');
      expect(Snowflake.metadata.supportedFeatureIds).toContain('agentBuilder');
    });
  });

  describe('auth', () => {
    it('supports bearer auth for PAT tokens', () => {
      const types = (Snowflake.auth?.types as Array<string | { type: string }>).map((t) =>
        typeof t === 'string' ? t : t.type
      );
      expect(types).toContain('bearer');
    });

    it('supports oauth_authorization_code', () => {
      const oauthType = (Snowflake.auth?.types as Array<string | { type: string }>).find(
        (t) => typeof t === 'object' && t.type === 'oauth_authorization_code'
      );
      expect(oauthType).toBeDefined();
    });

    it('sets required headers', () => {
      expect(Snowflake.auth?.headers).toMatchObject({
        Accept: 'application/json',
        'Content-Type': 'application/json',
      });
    });
  });

  describe('executeStatement action', () => {
    it('should execute a simple SQL statement asynchronously', async () => {
      const mockResponse = {
        status: 202,
        data: {
          code: '333334',
          message: 'Asynchronous execution in progress.',
          statementHandle: '019c06a4-0000-df4f-0000-00100006589e',
          statementStatusUrl: '/api/v2/statements/019c06a4-0000-df4f-0000-00100006589e',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await Snowflake.actions.executeStatement.handler(mockContext, {
        statement: 'SELECT * FROM customers LIMIT 10',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${ACCOUNT_URL}/api/v2/statements`,
        expect.objectContaining({
          statement: 'SELECT * FROM customers LIMIT 10',
          warehouse: 'COMPUTE_WH',
          database: 'PROD_DB',
          schema: 'PUBLIC',
          role: 'ANALYST',
        }),
        expect.objectContaining({
          params: { async: true },
          headers: { 'X-Snowflake-Authorization-Token-Type': 'OAUTH' },
        })
      );
      expect(result.statementHandle).toBe('019c06a4-0000-df4f-0000-00100006589e');
    });

    it('should override config defaults with per-request values', async () => {
      const mockResponse = {
        status: 202,
        data: { statementHandle: 'handle-123' },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await Snowflake.actions.executeStatement.handler(mockContext, {
        statement: 'SELECT 1',
        warehouse: 'OVERRIDE_WH',
        database: 'OVERRIDE_DB',
        schema: 'OVERRIDE_SCHEMA',
        role: 'OVERRIDE_ROLE',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          warehouse: 'OVERRIDE_WH',
          database: 'OVERRIDE_DB',
          schema: 'OVERRIDE_SCHEMA',
          role: 'OVERRIDE_ROLE',
        }),
        expect.any(Object)
      );
    });

    it('should include bind variables when provided', async () => {
      const mockResponse = { status: 202, data: { statementHandle: 'handle-456' } };
      mockClient.post.mockResolvedValue(mockResponse);

      await Snowflake.actions.executeStatement.handler(mockContext, {
        statement: 'SELECT * FROM users WHERE id = ?',
        bindings: {
          '1': { type: 'FIXED', value: '42' },
        },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          bindings: { '1': { type: 'FIXED', value: '42' } },
        }),
        expect.any(Object)
      );
    });

    it('should set multi-statement count and query tag as parameters', async () => {
      const mockResponse = { status: 202, data: { statementHandle: 'handle-789' } };
      mockClient.post.mockResolvedValue(mockResponse);

      await Snowflake.actions.executeStatement.handler(mockContext, {
        statement: 'CREATE TABLE t(id INT); INSERT INTO t VALUES(1)',
        multiStatementCount: 2,
        queryTag: 'kibana-agent-query',
      });

      const [, body] = mockClient.post.mock.calls[0];
      expect(body.parameters).toEqual({
        MULTI_STATEMENT_COUNT: '2',
        QUERY_TAG: 'kibana-agent-query',
      });
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('SQL compilation error'));

      await expect(
        Snowflake.actions.executeStatement.handler(mockContext, {
          statement: 'SELECT * FROM nonexistent',
        })
      ).rejects.toThrow('SQL compilation error');
    });
  });

  describe('getStatementStatus action', () => {
    it('should check status of a running statement (202)', async () => {
      const mockResponse = {
        status: 202,
        data: {
          code: '333334',
          message: 'Asynchronous execution in progress.',
          statementHandle: 'handle-123',
          statementStatusUrl: '/api/v2/statements/handle-123',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Snowflake.actions.getStatementStatus.handler(mockContext, {
        statementHandle: 'handle-123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ACCOUNT_URL}/api/v2/statements/handle-123`,
        expect.objectContaining({
          params: {},
          headers: { 'X-Snowflake-Authorization-Token-Type': 'OAUTH' },
        })
      );
      expect(result.code).toBe('333334');
    });

    it('should return results for a completed statement (200)', async () => {
      const mockResponse = {
        status: 200,
        data: {
          resultSetMetaData: {
            numRows: 2,
            rowType: [
              { name: 'ID', type: 'fixed' },
              { name: 'NAME', type: 'text' },
            ],
          },
          data: [
            ['1', 'Alice'],
            ['2', 'Bob'],
          ],
          code: '090001',
          message: 'Statement executed successfully.',
          statementHandle: 'handle-123',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await Snowflake.actions.getStatementStatus.handler(mockContext, {
        statementHandle: 'handle-123',
      });

      expect(result.data).toEqual([
        ['1', 'Alice'],
        ['2', 'Bob'],
      ]);
    });

    it('should pass partition parameter when provided', async () => {
      const mockResponse = { status: 200, data: { data: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await Snowflake.actions.getStatementStatus.handler(mockContext, {
        statementHandle: 'handle-123',
        partition: 2,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ params: { partition: 2 } })
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Statement not found'));

      await expect(
        Snowflake.actions.getStatementStatus.handler(mockContext, {
          statementHandle: 'invalid-handle',
        })
      ).rejects.toThrow('Statement not found');
    });
  });

  describe('cancelStatement action', () => {
    it('should cancel a running statement', async () => {
      const mockResponse = {
        status: 200,
        data: {
          code: '000604',
          sqlState: '57014',
          message: 'SQL execution canceled',
          statementHandle: 'handle-123',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await Snowflake.actions.cancelStatement.handler(mockContext, {
        statementHandle: 'handle-123',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${ACCOUNT_URL}/api/v2/statements/handle-123/cancel`,
        {},
        expect.objectContaining({
          headers: { 'X-Snowflake-Authorization-Token-Type': 'OAUTH' },
        })
      );
      expect(result.message).toBe('SQL execution canceled');
    });

    it('should handle cancellation of already completed statement (422)', async () => {
      const mockResponse = {
        status: 422,
        data: {
          code: '000709',
          message: 'Statement handle-finished not found',
          statementHandle: 'handle-finished',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await Snowflake.actions.cancelStatement.handler(mockContext, {
        statementHandle: 'handle-finished',
      });

      expect(result.code).toBe('000709');
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        Snowflake.actions.cancelStatement.handler(mockContext, {
          statementHandle: 'handle-123',
        })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('test handler', () => {
    const testHandler = Snowflake.test?.handler;

    it('should have a test handler defined', () => {
      expect(testHandler).toBeDefined();
    });

    it('should return success when Snowflake is reachable with immediate result', async () => {
      const mockResponse = {
        status: 200,
        data: {
          data: [['8.44.0']],
          code: '090001',
          message: 'Statement executed successfully.',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await testHandler?.(mockContext);

      expect(mockClient.post).toHaveBeenCalledWith(
        `${ACCOUNT_URL}/api/v2/statements`,
        { statement: 'SELECT CURRENT_VERSION()' },
        expect.any(Object)
      );
      expect(result?.ok).toBe(true);
      expect(result?.message).toContain('8.44.0');
    });

    it('should return success when statement is accepted asynchronously', async () => {
      const mockResponse = {
        status: 202,
        data: {
          statementHandle: 'handle-test',
          message: 'Asynchronous execution in progress.',
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await testHandler?.(mockContext);

      expect(result?.ok).toBe(true);
      expect(result?.message).toContain('handle-test');
    });
  });
});
