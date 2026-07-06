/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';

interface MockPool {
  query: jest.Mock;
  execute: jest.Mock;
  end: jest.Mock;
}

const createMockPool = (): MockPool => ({
  query: jest.fn().mockResolvedValue([[]]),
  execute: jest.fn().mockResolvedValue([[]]),
  end: jest.fn().mockResolvedValue(undefined),
});

let mockPoolsByCall: MockPool[] = [];
const mockCreatePool = jest.fn(() => {
  const pool = createMockPool();
  mockPoolsByCall.push(pool);
  return pool;
}) as jest.Mock<MockPool, unknown[]>;

jest.mock('mysql2/promise', () => ({
  createPool: (...args: unknown[]) => mockCreatePool(...args),
}));

const makeConfig = (overrides: Record<string, unknown> = {}) => ({
  host: 'db.example.com',
  port: 3306,
  database: 'testdb',
  ...overrides,
});

const makeSecrets = (overrides: Record<string, unknown> = {}) => ({
  username: 'tester',
  password: 'secret',
  ...overrides,
});

const makeContext = (
  config: Record<string, unknown>,
  secrets: Record<string, unknown> = makeSecrets()
): ActionContext =>
  ({
    config,
    secrets,
    log: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext);

describe('MysqlConnector', () => {
  // The connector keeps a module-level connection pool cache, so each test
  // gets a fresh module instance to avoid pool state leaking across tests.
  let MysqlConnector: ConnectorSpec;

  let configSchema: NonNullable<ConnectorSpec['schema']>;

  beforeEach(() => {
    jest.resetModules();
    mockCreatePool.mockClear();
    mockPoolsByCall = [];
    ({ MysqlConnector } = require('./mysql'));
    if (!MysqlConnector.schema) {
      throw new Error('MySQL spec is missing a config schema');
    }
    configSchema = MysqlConnector.schema;
  });

  describe('metadata', () => {
    it('has the correct connector id and display name', () => {
      expect(MysqlConnector.metadata.id).toBe('.mysql');
      expect(MysqlConnector.metadata.displayName).toBe('MySQL');
    });

    it('uses basic auth so credentials are encrypted, not stored in schema', () => {
      expect(MysqlConnector.auth?.types).toEqual(['basic']);
      expect(configSchema.shape).not.toHaveProperty('username');
      expect(configSchema.shape).not.toHaveProperty('password');
    });

    it('is marked as technical preview', () => {
      expect(MysqlConnector.metadata.isTechnicalPreview).toBe(true);
    });

    it('supports workflows and agentBuilder features', () => {
      expect(MysqlConnector.metadata.supportedFeatureIds).toContain('workflows');
      expect(MysqlConnector.metadata.supportedFeatureIds).toContain('agentBuilder');
    });
  });

  describe('schema', () => {
    it('accepts a fully populated config', () => {
      const result = configSchema.safeParse(makeConfig());
      expect(result.success).toBe(true);
    });

    it('coerces a string port into a number', () => {
      const result = configSchema.parse(makeConfig({ port: '3306' }));
      expect(result.port).toBe(3306);
    });

    it.each(['host', 'port', 'database'])('rejects a config missing %s', (field) => {
      const config = makeConfig();
      delete (config as Record<string, unknown>)[field];
      expect(configSchema.safeParse(config).success).toBe(false);
    });
  });

  describe('tool exposure (isTool flags)', () => {
    it('marks every action as an agent-facing tool', () => {
      for (const action of Object.values(MysqlConnector.actions)) {
        expect(action.isTool).toBe(true);
      }
    });
  });

  describe('query action', () => {
    it('wraps the statement in a bounded outer SELECT with the default maxRows', async () => {
      const ctx = makeContext(makeConfig());

      await MysqlConnector.actions.query.handler(ctx, { sql: 'SELECT * FROM users' });

      const pool = mockPoolsByCall[0];
      expect(pool.execute).toHaveBeenCalledWith(
        'SELECT * FROM (\nSELECT * FROM users\n) AS _q LIMIT ?',
        [100]
      );
    });

    it('respects a custom maxRows', async () => {
      const ctx = makeContext(makeConfig());

      await MysqlConnector.actions.query.handler(ctx, {
        sql: 'SELECT * FROM users',
        maxRows: 5,
      });

      const pool = mockPoolsByCall[0];
      expect(pool.execute).toHaveBeenCalledWith(expect.any(String), [5]);
    });

    it('rejects a write statement without opening a connection', async () => {
      const ctx = makeContext(makeConfig());

      await expect(
        MysqlConnector.actions.query.handler(ctx, { sql: 'DROP TABLE users' })
      ).rejects.toThrow(/read-only/i);
      expect(mockCreatePool).not.toHaveBeenCalled();
    });

    it('rejects multi-statement input', async () => {
      const ctx = makeContext(makeConfig());

      await expect(
        MysqlConnector.actions.query.handler(ctx, {
          sql: 'SELECT 1; DROP TABLE users',
        })
      ).rejects.toThrow(/multi-statement/i);
      expect(mockCreatePool).not.toHaveBeenCalled();
    });
  });

  describe('listDatabases action', () => {
    it('runs SHOW DATABASES', async () => {
      const ctx = makeContext(makeConfig());

      await MysqlConnector.actions.listDatabases.handler(ctx, {});

      const pool = mockPoolsByCall[0];
      expect(pool.query).toHaveBeenCalledWith('SHOW DATABASES');
    });
  });

  describe('listTables action', () => {
    it('quotes the target database and defaults to the configured database', async () => {
      const ctx = makeContext(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.listTables.handler(ctx, {});

      const pool = mockPoolsByCall[0];
      expect(pool.query).toHaveBeenCalledWith('SHOW TABLES FROM `my_db`');
    });

    it('uses the explicitly provided database over the configured default', async () => {
      const ctx = makeContext(makeConfig({ database: 'default_db' }));

      await MysqlConnector.actions.listTables.handler(ctx, { database: 'other_db' });

      const pool = mockPoolsByCall[0];
      expect(pool.query).toHaveBeenCalledWith('SHOW TABLES FROM `other_db`');
    });

    it('throws when no database is provided or configured', async () => {
      const ctx = makeContext(makeConfig({ database: undefined }));

      await expect(MysqlConnector.actions.listTables.handler(ctx, {})).rejects.toThrow(
        /no database specified/i
      );
    });
  });

  describe('describeTable action', () => {
    it('quotes both the database and table name', async () => {
      const ctx = makeContext(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.describeTable.handler(ctx, { table: 'orders' });

      const pool = mockPoolsByCall[0];
      expect(pool.query).toHaveBeenCalledWith('DESCRIBE `my_db`.`orders`');
    });

    it('escapes backticks embedded in an identifier', async () => {
      const ctx = makeContext(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.describeTable.handler(ctx, { table: 'weird`table' });

      const pool = mockPoolsByCall[0];
      expect(pool.query).toHaveBeenCalledWith('DESCRIBE `my_db`.`weird``table`');
    });
  });

  describe('searchRows action', () => {
    it('builds an OR-joined LIKE clause across the requested columns', async () => {
      const ctx = makeContext(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.searchRows.handler(ctx, {
        table: 'users',
        searchTerm: 'jane',
        columns: ['name', 'email'],
      });

      const pool = mockPoolsByCall[0];
      expect(pool.execute).toHaveBeenCalledWith(
        "SELECT * FROM `my_db`.`users` WHERE `name` LIKE ? ESCAPE '!' OR `email` LIKE ? ESCAPE '!' LIMIT ?",
        ['%jane%', '%jane%', 100]
      );
    });

    it('escapes SQL LIKE wildcards in the search term', async () => {
      const ctx = makeContext(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.searchRows.handler(ctx, {
        table: 'users',
        searchTerm: '50%_off',
        columns: ['notes'],
      });

      const pool = mockPoolsByCall[0];
      const [, params] = pool.execute.mock.calls[0];
      expect(params[0]).toBe('%50!%!_off%');
    });

    it('respects a custom maxRows', async () => {
      const ctx = makeContext(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.searchRows.handler(ctx, {
        table: 'users',
        searchTerm: 'jane',
        columns: ['name'],
        maxRows: 25,
      });

      const pool = mockPoolsByCall[0];
      const [, params] = pool.execute.mock.calls[0];
      expect(params[params.length - 1]).toBe(25);
    });
  });

  describe('test handler', () => {
    it('reports success when the connection works', async () => {
      const ctx = makeContext(makeConfig());

      const result = await MysqlConnector.test?.handler(ctx);

      expect(result?.ok).toBe(true);
      expect(mockPoolsByCall[0].query).toHaveBeenCalledWith('SELECT 1');
    });

    it('reports failure with the underlying error message', async () => {
      const ctx = makeContext(makeConfig());
      mockCreatePool.mockImplementationOnce(() => {
        const pool = createMockPool();
        pool.query.mockRejectedValue(new Error('connect ECONNREFUSED'));
        mockPoolsByCall.push(pool);
        return pool;
      });

      const result = await MysqlConnector.test?.handler(ctx);

      expect(result?.ok).toBe(false);
      expect(result?.message).toBe('connect ECONNREFUSED');
    });
  });

  describe('connection pooling', () => {
    it('reuses a cached pool for repeated calls with identical config and secrets', async () => {
      const config = makeConfig();
      const secrets = makeSecrets();
      const ctx1 = makeContext(config, secrets);
      const ctx2 = makeContext(config, secrets);

      await MysqlConnector.actions.listDatabases.handler(ctx1, {});
      await MysqlConnector.actions.listDatabases.handler(ctx2, {});

      expect(mockCreatePool).toHaveBeenCalledTimes(1);
    });

    it('opens a new pool when credentials differ even for the same host', async () => {
      const ctx1 = makeContext(makeConfig(), makeSecrets({ password: 'secret-a' }));
      const ctx2 = makeContext(makeConfig(), makeSecrets({ password: 'secret-b' }));

      await MysqlConnector.actions.listDatabases.handler(ctx1, {});
      await MysqlConnector.actions.listDatabases.handler(ctx2, {});

      expect(mockCreatePool).toHaveBeenCalledTimes(2);
    });

    it('evicts the oldest pool once the cache exceeds its capacity', async () => {
      // The pool cache holds at most 10 entries; the 11th distinct config
      // must evict the first (oldest) one and close it.
      const contexts = Array.from({ length: 11 }, (_, i) =>
        makeContext(makeConfig({ host: `db-${i}.example.com` }))
      );

      for (const ctx of contexts) {
        await MysqlConnector.actions.listDatabases.handler(ctx, {});
      }

      expect(mockCreatePool).toHaveBeenCalledTimes(11);
      expect(mockPoolsByCall[0].end).toHaveBeenCalledTimes(1);
      // Only the oldest pool is evicted — the rest stay open.
      for (const pool of mockPoolsByCall.slice(1)) {
        expect(pool.end).not.toHaveBeenCalled();
      }
    });
  });
});
