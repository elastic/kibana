/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';

interface MockClient {
  query: jest.Mock;
  release: jest.Mock;
}

interface MockPool {
  connect: jest.Mock;
  query: jest.Mock;
  client: MockClient;
}

const createMockPool = (): MockPool => {
  const client: MockClient = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    release: jest.fn(),
  };
  return {
    client,
    connect: jest.fn().mockResolvedValue(client),
    query: jest.fn().mockResolvedValue({ command: 'SELECT', rowCount: 0, rows: [] }),
  };
};

const makeConfig = (overrides: Record<string, unknown> = {}) => ({
  host: 'db.example.com',
  port: 5432,
  database: 'testdb',
  ...overrides,
});

const makeContext = (
  pool: MockPool = createMockPool()
): { ctx: ActionContext; pool: MockPool } => ({
  ctx: {
    config: makeConfig(),
    log: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
    getClient: jest.fn().mockResolvedValue(pool),
  } as unknown as ActionContext,
  pool,
});

// The statements run on the leased client, in order: BEGIN READ ONLY, the statement, ROLLBACK.
const statementsOn = (pool: MockPool): string[] =>
  pool.client.query.mock.calls.map(([sql]: [string]) => sql);

describe('PostgresConnector', () => {
  let PostgresConnector: ConnectorSpec;
  let configSchema: NonNullable<ConnectorSpec['schema']>;

  beforeEach(() => {
    ({ PostgresConnector } = require('./postgres'));
    if (!PostgresConnector.schema) {
      throw new Error('PostgreSQL spec is missing a config schema');
    }
    configSchema = PostgresConnector.schema;
  });

  describe('metadata', () => {
    it('has the correct connector id and display name', () => {
      expect(PostgresConnector.metadata.id).toBe('.postgres');
      expect(PostgresConnector.metadata.displayName).toBe('PostgreSQL');
    });

    it('uses basic auth so credentials are encrypted, not stored in schema', () => {
      expect(PostgresConnector.auth?.types).toEqual(['basic']);
      expect(configSchema.shape).not.toHaveProperty('username');
      expect(configSchema.shape).not.toHaveProperty('password');
    });

    it('is marked as technical preview', () => {
      expect(PostgresConnector.metadata.isTechnicalPreview).toBe(true);
    });

    it('supports agentBuilder only (workflows added in a follow-up)', () => {
      expect(PostgresConnector.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('does not declare inbound events on the first PR for the connector type', () => {
      expect(PostgresConnector.events).toBeUndefined();
    });
  });

  describe('schema', () => {
    it('accepts a fully populated config', () => {
      expect(configSchema.safeParse(makeConfig()).success).toBe(true);
    });

    it('defaults port to 5432 when omitted', () => {
      const config: Record<string, unknown> = makeConfig();
      delete config.port;
      expect(configSchema.parse(config).port).toBe(5432);
    });

    it('rejects an out-of-range port', () => {
      expect(configSchema.safeParse(makeConfig({ port: 99999 })).success).toBe(false);
    });

    it('rejects a host with a protocol prefix', () => {
      expect(
        configSchema.safeParse(makeConfig({ host: 'postgres://db.example.com' })).success
      ).toBe(false);
    });

    it.each(['host', 'database'])('rejects a config missing %s', (field) => {
      const config: Record<string, unknown> = makeConfig();
      delete config[field];
      expect(configSchema.safeParse(config).success).toBe(false);
    });

    it('rejects a database name over the 63-byte identifier limit', () => {
      expect(configSchema.safeParse(makeConfig({ database: 'a'.repeat(64) })).success).toBe(false);
    });

    it('defaults TLS to required', () => {
      expect(configSchema.parse(makeConfig()).ssl).toBe('required');
    });
  });

  describe('tool exposure and scope', () => {
    const readActions = ['query', 'listSchemas', 'listTables', 'describeTable', 'searchRows'];

    it('marks read actions as agent-facing tools and executeSql as not a tool', () => {
      for (const name of readActions) {
        expect(PostgresConnector.actions[name].isTool).toBe(true);
      }
      expect(PostgresConnector.actions.executeSql.isTool).toBe(false);
    });

    it('marks all discovery/query actions as read scope', () => {
      for (const name of readActions) {
        expect(PostgresConnector.actions[name].scope).toBe('read');
      }
    });

    it('marks executeSql as destroy scope', () => {
      expect(PostgresConnector.actions.executeSql.scope).toBe('destroy');
    });
  });

  describe('query action', () => {
    it('runs the SQL as-is inside a READ ONLY transaction that is rolled back', async () => {
      const { ctx, pool } = makeContext();
      pool.client.query.mockImplementation(async (sql: string) =>
        sql.startsWith('SELECT id') ? { rows: [{ id: 1, name: 'a' }] } : { rows: [] }
      );

      const result = await PostgresConnector.actions.query.handler(ctx, {
        sql: 'SELECT id, name FROM users ORDER BY name LIMIT 20',
      });

      expect(statementsOn(pool)).toEqual([
        'BEGIN READ ONLY',
        'SELECT id, name FROM users ORDER BY name LIMIT 20',
        'ROLLBACK',
      ]);
      expect(result).toEqual([{ id: 1, name: 'a' }]);
      expect(pool.client.release).toHaveBeenCalledWith(undefined);
    });

    it('rolls back and releases the client when the statement fails', async () => {
      const { ctx, pool } = makeContext();
      pool.client.query.mockImplementation(async (sql: string) => {
        if (sql.startsWith('SELECT')) throw new Error('relation "nope" does not exist');
        return { rows: [] };
      });

      await expect(
        PostgresConnector.actions.query.handler(ctx, { sql: 'SELECT * FROM nope' })
      ).rejects.toThrow('relation "nope" does not exist');

      expect(statementsOn(pool)).toContain('ROLLBACK');
      expect(pool.client.release).toHaveBeenCalledTimes(1);
    });

    it('discards the connection when the rollback itself fails', async () => {
      const { ctx, pool } = makeContext();
      const rollbackFailure = new Error('connection terminated');
      pool.client.query.mockImplementation(async (sql: string) => {
        if (sql === 'ROLLBACK') throw rollbackFailure;
        return { rows: [] };
      });

      await PostgresConnector.actions.query.handler(ctx, { sql: 'SELECT 1' });

      expect(pool.client.release).toHaveBeenCalledWith(rollbackFailure);
    });

    it.each([
      ['a write statement', 'DROP TABLE users', /read-only/i],
      ['multi-statement input', 'SELECT 1; DROP TABLE users', /multi-statement/i],
      ['SHOW', 'SHOW search_path', /read-only/i],
      ['EXPLAIN', 'EXPLAIN SELECT 1', /read-only/i],
      ['a write hidden behind a leading comment', '-- fine\nDROP TABLE users', /read-only/i],
      [
        'a write after a CTE',
        'WITH x AS (SELECT 1) INSERT INTO t SELECT * FROM x',
        /not permitted/i,
      ],
    ])('rejects %s before leasing a connection', async (_label, sql, message) => {
      const { ctx } = makeContext();

      await expect(PostgresConnector.actions.query.handler(ctx, { sql })).rejects.toThrow(message);
      expect(ctx.getClient).not.toHaveBeenCalled();
    });
  });

  describe('listSchemas action', () => {
    it('excludes system schemas and filters by USAGE privilege', async () => {
      const { ctx, pool } = makeContext();

      await PostgresConnector.actions.listSchemas.handler(ctx, {});

      const sql = statementsOn(pool)[1];
      expect(sql).toContain("NOT IN ('pg_catalog', 'information_schema')");
      expect(sql).toContain("has_schema_privilege(n.oid, 'USAGE')");
    });
  });

  describe('listTables action', () => {
    it('defaults to the public schema and binds it as a parameter', async () => {
      const { ctx, pool } = makeContext();

      await PostgresConnector.actions.listTables.handler(ctx, {});

      expect(pool.client.query).toHaveBeenCalledWith(expect.stringContaining('n.nspname = $1'), [
        'public',
      ]);
    });

    it('uses the explicitly provided schema without interpolating it into the SQL', async () => {
      const { ctx, pool } = makeContext();

      await PostgresConnector.actions.listTables.handler(ctx, { schema: "x'; DROP TABLE t; --" });

      const [sql, params] = pool.client.query.mock.calls[1];
      expect(params).toEqual(["x'; DROP TABLE t; --"]);
      expect(sql).not.toContain('DROP TABLE');
    });

    it('includes views, materialized views, and foreign tables but not partitions', async () => {
      const { ctx, pool } = makeContext();

      await PostgresConnector.actions.listTables.handler(ctx, {});

      const sql = statementsOn(pool)[1];
      expect(sql).toContain("c.relkind IN ('r', 'p', 'v', 'm', 'f')");
      expect(sql).toContain('NOT c.relispartition');
    });
  });

  describe('describeTable action', () => {
    it('binds schema and table as parameters, defaulting the schema to public', async () => {
      const { ctx, pool } = makeContext();
      pool.client.query.mockImplementation(async (sql: string) =>
        sql.includes('pg_attribute') ? { rows: [{ column_name: 'id' }] } : { rows: [] }
      );

      const result = await PostgresConnector.actions.describeTable.handler(ctx, {
        table: 'orders',
      });

      expect(pool.client.query).toHaveBeenCalledWith(expect.stringContaining('c.relname = $2'), [
        'public',
        'orders',
      ]);
      expect(result).toEqual([{ column_name: 'id' }]);
    });

    it('throws a helpful error when the table is not found', async () => {
      const { ctx, pool } = makeContext();

      await expect(
        PostgresConnector.actions.describeTable.handler(ctx, { table: 'nope', schema: 'sales' })
      ).rejects.toThrow(/sales\.nope was not found.*listTables/);
      expect(statementsOn(pool)).toContain('ROLLBACK');
    });
  });

  describe('searchRows action', () => {
    it('builds an OR-joined ILIKE clause that reuses one bound parameter', async () => {
      const { ctx, pool } = makeContext();

      await PostgresConnector.actions.searchRows.handler(ctx, {
        table: 'users',
        searchTerm: 'jane',
        columns: ['name', 'email'],
      });

      expect(pool.client.query).toHaveBeenCalledWith(
        `SELECT * FROM "public"."users" WHERE "name"::text ILIKE $1 ESCAPE '!' OR "email"::text ILIKE $1 ESCAPE '!' LIMIT 100`,
        ['%jane%']
      );
    });

    it('preserves the case of the search term (ILIKE does the case folding)', async () => {
      const { ctx, pool } = makeContext();

      await PostgresConnector.actions.searchRows.handler(ctx, {
        table: 'users',
        searchTerm: 'Jane',
        columns: ['name'],
      });

      expect(pool.client.query.mock.calls[1][1]).toEqual(['%Jane%']);
    });

    it('escapes LIKE wildcards in the search term', async () => {
      const { ctx, pool } = makeContext();

      await PostgresConnector.actions.searchRows.handler(ctx, {
        table: 'users',
        searchTerm: '50%_off!',
        columns: ['notes'],
      });

      expect(pool.client.query.mock.calls[1][1]).toEqual(['%50!%!_off!!%']);
    });

    it('passes single quotes in the search term unmodified — the driver binds them', async () => {
      const { ctx, pool } = makeContext();

      await PostgresConnector.actions.searchRows.handler(ctx, {
        table: 'users',
        searchTerm: "o'brien",
        columns: ['name'],
      });

      expect(pool.client.query.mock.calls[1][1]).toEqual(["%o'brien%"]);
    });

    it('double-quotes identifiers and escapes embedded double quotes', async () => {
      const { ctx, pool } = makeContext();

      await PostgresConnector.actions.searchRows.handler(ctx, {
        table: 'we"ird',
        schema: 'My Schema',
        searchTerm: 'x',
        columns: ['co"l'],
      });

      const sql = pool.client.query.mock.calls[1][0];
      expect(sql).toContain('"My Schema"."we""ird"');
      expect(sql).toContain('"co""l"::text ILIKE $1');
    });

    it('respects a custom maxRows', async () => {
      const { ctx, pool } = makeContext();

      await PostgresConnector.actions.searchRows.handler(ctx, {
        table: 'users',
        searchTerm: 'jane',
        columns: ['name'],
        maxRows: 25,
      });

      expect(pool.client.query.mock.calls[1][0]).toContain('LIMIT 25');
    });

    it('rejects a maxRows above the cap', async () => {
      const { ctx } = makeContext();

      await expect(
        PostgresConnector.actions.searchRows.handler(ctx, {
          table: 'users',
          searchTerm: 'jane',
          columns: ['name'],
          maxRows: 5000,
        })
      ).rejects.toThrow(/maxRows/);
    });

    it('rejects an identifier over the 63-byte limit at the schema boundary', () => {
      const result = PostgresConnector.actions.searchRows.input?.safeParse({
        table: 'a'.repeat(64),
        searchTerm: 'x',
        columns: ['c'],
      });
      expect(result?.success).toBe(false);
    });

    it('rejects an identifier over 63 bytes even when it is under 63 characters', () => {
      // 32 two-byte characters is 64 bytes; PostgreSQL would silently truncate the identifier.
      const input = PostgresConnector.actions.describeTable.input;
      expect(input?.safeParse({ table: 'é'.repeat(32) }).success).toBe(false);
      expect(input?.safeParse({ table: 'é'.repeat(31) }).success).toBe(true);
    });

    it('applies the same byte limit to the configured database name', () => {
      expect(configSchema.safeParse(makeConfig({ database: 'é'.repeat(32) })).success).toBe(false);
    });
  });

  describe('query action on the server side', () => {
    it('leaves SELECT ... INTO to the READ ONLY transaction, which PostgreSQL rejects', async () => {
      const { ctx, pool } = makeContext();
      pool.client.query.mockImplementation(async (sql: string) => {
        if (sql.startsWith('SELECT')) {
          throw new Error('cannot execute SELECT INTO in a read-only transaction');
        }
        return { rows: [] };
      });

      await expect(
        PostgresConnector.actions.query.handler(ctx, { sql: 'SELECT * INTO copy FROM users' })
      ).rejects.toThrow(/read-only transaction/);
    });
  });

  describe('executeSql action', () => {
    it('runs the SQL directly on the pool, outside a read-only transaction', async () => {
      const { ctx, pool } = makeContext();
      pool.query.mockResolvedValue({ command: 'DROP', rowCount: null, rows: [] });

      const result = await PostgresConnector.actions.executeSql.handler(ctx, {
        sql: 'DROP TABLE users',
      });

      expect(pool.query).toHaveBeenCalledWith('DROP TABLE users');
      expect(pool.connect).not.toHaveBeenCalled();
      expect(result).toEqual({ command: 'DROP', rowCount: null, rows: [] });
    });

    it('returns one summary per statement for multi-statement SQL', async () => {
      const { ctx, pool } = makeContext();
      pool.query.mockResolvedValue([
        { command: 'CREATE', rowCount: null, rows: [], fields: [] },
        { command: 'INSERT', rowCount: 2, rows: [], fields: [] },
      ]);

      const result = await PostgresConnector.actions.executeSql.handler(ctx, {
        sql: 'CREATE TABLE t(id int); INSERT INTO t VALUES (1), (2)',
      });

      expect(result).toEqual([
        { command: 'CREATE', rowCount: null, rows: [] },
        { command: 'INSERT', rowCount: 2, rows: [] },
      ]);
    });

    it('returns rows and the affected row count for INSERT ... RETURNING', async () => {
      const { ctx, pool } = makeContext();
      pool.query.mockResolvedValue({ command: 'INSERT', rowCount: 1, rows: [{ id: 7 }] });

      const result = await PostgresConnector.actions.executeSql.handler(ctx, {
        sql: "INSERT INTO users (name) VALUES ('alice') RETURNING id",
      });

      expect(result).toEqual({ command: 'INSERT', rowCount: 1, rows: [{ id: 7 }] });
    });
  });

  describe('test handler', () => {
    it('returns a success message when the connection works', async () => {
      const { ctx, pool } = makeContext();

      const result = await PostgresConnector.test?.handler(ctx);

      expect(pool.query).toHaveBeenCalledWith('SELECT 1');
      expect(result?.message).toMatch(/connected/i);
    });

    it('throws when the connection fails', async () => {
      const pool = createMockPool();
      pool.query.mockRejectedValue(new Error('connect ECONNREFUSED'));
      const { ctx } = makeContext(pool);

      await expect(PostgresConnector.test?.handler(ctx)).rejects.toThrow('connect ECONNREFUSED');
    });
  });
});
