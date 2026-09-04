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

const makeConfig = (overrides: Record<string, unknown> = {}) => ({
  host: 'db.example.com',
  port: 3306,
  database: 'testdb',
  ...overrides,
});

const makeContext = (
  config: Record<string, unknown>,
  pool: MockPool = createMockPool()
): ActionContext =>
  ({
    config,
    log: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
    getClient: jest.fn().mockResolvedValue(pool),
  } as unknown as ActionContext);

// Convenience wrapper when pool behaviour needs to be inspected in the test.
const makeContextWithPool = (
  config: Record<string, unknown> = makeConfig()
): { ctx: ActionContext; pool: MockPool } => {
  const pool = createMockPool();
  return { ctx: makeContext(config, pool), pool };
};

describe('MysqlConnector', () => {
  let MysqlConnector: ConnectorSpec;
  let configSchema: NonNullable<ConnectorSpec['schema']>;

  beforeEach(() => {
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

    it('supports agentBuilder feature (workflows added in a follow-up)', () => {
      expect(MysqlConnector.metadata.supportedFeatureIds).toContain('agentBuilder');
      expect(MysqlConnector.metadata.supportedFeatureIds).not.toContain('workflows');
    });
  });

  describe('schema', () => {
    it('accepts a fully populated config', () => {
      const result = configSchema.safeParse(makeConfig());
      expect(result.success).toBe(true);
    });

    it('accepts a numeric port', () => {
      const result = configSchema.parse(makeConfig({ port: 3306 }));
      expect(result.port).toBe(3306);
    });

    it('defaults port to 3306 when omitted', () => {
      const config = makeConfig();
      delete (config as Record<string, unknown>).port;
      const result = configSchema.parse(config);
      expect(result.port).toBe(3306);
    });

    it('rejects an out-of-range port', () => {
      expect(configSchema.safeParse(makeConfig({ port: 99999 })).success).toBe(false);
    });

    it('rejects a host with a protocol prefix', () => {
      expect(configSchema.safeParse(makeConfig({ host: 'mysql://db.example.com' })).success).toBe(
        false
      );
    });

    it.each(['host', 'database'])('rejects a config missing %s', (field) => {
      const config = makeConfig();
      delete (config as Record<string, unknown>)[field];
      expect(configSchema.safeParse(config).success).toBe(false);
    });

    it('defaults TLS to required', () => {
      const result = configSchema.parse(makeConfig());
      expect(result.ssl).toBe('required');
    });
  });

  describe('tool exposure and scope', () => {
    it('marks every action as an agent-facing tool', () => {
      for (const action of Object.values(MysqlConnector.actions)) {
        expect(action.isTool).toBe(true);
      }
    });

    it('marks all discovery/query actions as read scope', () => {
      const readActions = ['query', 'listDatabases', 'listTables', 'describeTable', 'searchRows'];
      for (const name of readActions) {
        expect(MysqlConnector.actions[name].scope).toBe('read');
      }
    });

    it('marks executeSql as destroy scope', () => {
      expect(MysqlConnector.actions.executeSql.scope).toBe('destroy');
    });
  });

  describe('query action', () => {
    it('passes SQL to the pool as-is', async () => {
      const { ctx, pool } = makeContextWithPool();

      await MysqlConnector.actions.query.handler(ctx, {
        sql: 'SELECT id, name FROM users ORDER BY name LIMIT 20',
      });

      expect(pool.query).toHaveBeenCalledWith('SELECT id, name FROM users ORDER BY name LIMIT 20');
    });

    it('rejects a write statement before leasing a connection', async () => {
      const { ctx } = makeContextWithPool();

      await expect(
        MysqlConnector.actions.query.handler(ctx, { sql: 'DROP TABLE users' })
      ).rejects.toThrow(/read-only/i);
      expect(ctx.getClient).not.toHaveBeenCalled();
    });

    it('rejects multi-statement input before leasing a connection', async () => {
      const { ctx } = makeContextWithPool();

      await expect(
        MysqlConnector.actions.query.handler(ctx, { sql: 'SELECT 1; DROP TABLE users' })
      ).rejects.toThrow(/multi-statement/i);
      expect(ctx.getClient).not.toHaveBeenCalled();
    });

    it('rejects SHOW / DESCRIBE so they are not wrapped in a subquery', async () => {
      const { ctx } = makeContextWithPool();

      await expect(
        MysqlConnector.actions.query.handler(ctx, { sql: 'SHOW TABLES' })
      ).rejects.toThrow(/read-only/i);
      await expect(
        MysqlConnector.actions.query.handler(ctx, { sql: 'DESCRIBE users' })
      ).rejects.toThrow(/read-only/i);
      expect(ctx.getClient).not.toHaveBeenCalled();
    });

    it('rejects a write hidden behind a leading comment', async () => {
      const { ctx } = makeContextWithPool();

      await expect(
        MysqlConnector.actions.query.handler(ctx, { sql: '-- looks fine\nDROP TABLE users' })
      ).rejects.toThrow(/read-only/i);
      expect(ctx.getClient).not.toHaveBeenCalled();
    });
  });

  describe('listDatabases action', () => {
    it('runs SHOW DATABASES', async () => {
      const { ctx, pool } = makeContextWithPool();

      await MysqlConnector.actions.listDatabases.handler(ctx, {});

      expect(pool.query).toHaveBeenCalledWith('SHOW DATABASES');
    });
  });

  describe('listTables action', () => {
    it('quotes the target database and defaults to the configured database', async () => {
      const { ctx, pool } = makeContextWithPool(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.listTables.handler(ctx, {});

      expect(pool.query).toHaveBeenCalledWith('SHOW TABLES FROM `my_db`');
    });

    it('uses the explicitly provided database over the configured default', async () => {
      const { ctx, pool } = makeContextWithPool(makeConfig({ database: 'default_db' }));

      await MysqlConnector.actions.listTables.handler(ctx, { database: 'other_db' });

      expect(pool.query).toHaveBeenCalledWith('SHOW TABLES FROM `other_db`');
    });

    it('throws when no database is provided or configured', async () => {
      const { ctx } = makeContextWithPool(makeConfig({ database: undefined }));

      await expect(MysqlConnector.actions.listTables.handler(ctx, {})).rejects.toThrow(
        /no database specified/i
      );
    });

    it('throws when the provided database is empty', async () => {
      const { ctx } = makeContextWithPool();

      await expect(
        MysqlConnector.actions.listTables.handler(ctx, { database: '' })
      ).rejects.toThrow(/no database specified/i);
    });
  });

  describe('describeTable action', () => {
    it('quotes both the database and table name', async () => {
      const { ctx, pool } = makeContextWithPool(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.describeTable.handler(ctx, { table: 'orders' });

      expect(pool.query).toHaveBeenCalledWith('DESCRIBE `my_db`.`orders`');
    });

    it('escapes backticks embedded in an identifier', async () => {
      const { ctx, pool } = makeContextWithPool(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.describeTable.handler(ctx, { table: 'weird`table' });

      expect(pool.query).toHaveBeenCalledWith('DESCRIBE `my_db`.`weird``table`');
    });
  });

  describe('searchRows action', () => {
    it('builds an OR-joined LIKE clause across the requested columns', async () => {
      const { ctx, pool } = makeContextWithPool(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.searchRows.handler(ctx, {
        table: 'users',
        searchTerm: 'jane',
        columns: ['name', 'email'],
      });

      expect(pool.execute).toHaveBeenCalledWith(
        "SELECT * FROM `my_db`.`users` WHERE LOWER(`name`) LIKE ? ESCAPE '!' OR LOWER(`email`) LIKE ? ESCAPE '!' LIMIT 100",
        ['%jane%', '%jane%']
      );
    });

    it('lowercases the search term so LIKE matching is case-insensitive', async () => {
      const { ctx, pool } = makeContextWithPool(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.searchRows.handler(ctx, {
        table: 'users',
        searchTerm: 'Jane',
        columns: ['name'],
      });

      const [, params] = pool.execute.mock.calls[0];
      expect(params[0]).toBe('%jane%');
    });

    it('escapes SQL LIKE wildcards in the search term', async () => {
      const { ctx, pool } = makeContextWithPool(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.searchRows.handler(ctx, {
        table: 'users',
        searchTerm: '50%_off',
        columns: ['notes'],
      });

      const [, params] = pool.execute.mock.calls[0];
      expect(params[0]).toBe('%50!%!_off%');
    });

    it('passes single quotes in the search term unmodified — the driver handles them', async () => {
      const { ctx, pool } = makeContextWithPool(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.searchRows.handler(ctx, {
        table: 'users',
        searchTerm: "o'brien",
        columns: ['name'],
      });

      const [, params] = pool.execute.mock.calls[0];
      expect(params[0]).toBe("%o'brien%");
    });

    it('respects a custom maxRows', async () => {
      const { ctx, pool } = makeContextWithPool(makeConfig({ database: 'my_db' }));

      await MysqlConnector.actions.searchRows.handler(ctx, {
        table: 'users',
        searchTerm: 'jane',
        columns: ['name'],
        maxRows: 25,
      });

      const [sql] = pool.execute.mock.calls[0];
      expect(sql).toContain('LIMIT 25');
    });
  });

  describe('executeSql action', () => {
    it('runs the SQL directly without any read-only guard', async () => {
      const { ctx, pool } = makeContextWithPool();

      await MysqlConnector.actions.executeSql.handler(ctx, {
        sql: 'DROP TABLE users',
      });

      expect(pool.query).toHaveBeenCalledWith('DROP TABLE users');
    });

    it('runs INSERT statements', async () => {
      const { ctx, pool } = makeContextWithPool();

      await MysqlConnector.actions.executeSql.handler(ctx, {
        sql: "INSERT INTO users (name) VALUES ('alice')",
      });

      expect(pool.query).toHaveBeenCalledWith("INSERT INTO users (name) VALUES ('alice')");
    });
  });

  describe('test handler', () => {
    it('returns a success message when the connection works', async () => {
      const { ctx, pool } = makeContextWithPool();

      const result = await MysqlConnector.test?.handler(ctx);

      expect(pool.query).toHaveBeenCalledWith('SELECT 1');
      expect(result?.message).toMatch(/connected/i);
    });

    it('throws when the connection fails', async () => {
      const pool = createMockPool();
      pool.query.mockRejectedValue(new Error('connect ECONNREFUSED'));
      const ctx = makeContext(makeConfig(), pool);

      await expect(MysqlConnector.test?.handler(ctx)).rejects.toThrow('connect ECONNREFUSED');
    });
  });
});
