/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { setResponseLimit } from '../../lib/clients/postgresql_response_limit';

type Row = Record<string, unknown>;

interface ScriptedResult {
  rows?: Row[];
  error?: Error;
  rowCount?: number | null;
  command?: string;
}

// Each statement sent through the checked-out client consumes the next scripted result for non-transaction
// statements; BEGIN/ROLLBACK are recorded but always succeed unless `rollbackFails` is set.
const makePool = (results: ScriptedResult[] = [{}], { rollbackFails = false } = {}) => {
  const queue = [...results];
  // Consumes the next scripted result; the last one repeats.
  const nextResult = (): ScriptedResult => (queue.length > 1 ? queue.shift() ?? {} : queue[0]);
  const statements: Array<{ text: string; values?: unknown[] }> = [];
  const client = Object.assign(new EventEmitter(), {
    query: jest.fn(async (arg: string | { text: string; values?: unknown[] }) => {
      const statement = typeof arg === 'string' ? { text: arg } : arg;
      statements.push(statement);
      if (statement.text === 'BEGIN READ ONLY') return {};
      if (statement.text === 'ROLLBACK') {
        if (rollbackFails) throw new Error('connection lost');
        return {};
      }
      const next = nextResult();
      if (next.error) throw next.error;
      return { rows: next.rows ?? [], rowCount: next.rowCount ?? next.rows?.length ?? 0 };
    }),
    release: jest.fn(),
  });
  const pool = {
    connect: jest.fn().mockResolvedValue(client),
    // Used by executeSql, which does not go through a read-only transaction.
    query: jest.fn(async (text: string) => {
      statements.push({ text });
      const next = nextResult();
      if (next.error) throw next.error;
      return Array.isArray(next.rows) && next.command === undefined
        ? { command: 'SELECT', rowCount: next.rows.length, rows: next.rows }
        : { command: next.command, rowCount: next.rowCount ?? null, rows: next.rows ?? [] };
    }),
  };
  /** Statements that were not transaction control, in order. */
  const sent = () =>
    statements.filter(({ text }) => text !== 'BEGIN READ ONLY' && text !== 'ROLLBACK');
  return { pool, client, statements, sent };
};

const makeConfig = (overrides: Record<string, unknown> = {}) => ({
  host: 'db.example.com',
  port: 5432,
  database: 'testdb',
  ssl: 'required',
  ...overrides,
});

const makeContext = (pool: unknown): ActionContext =>
  ({
    config: makeConfig(),
    log: { info: jest.fn(), debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
    getClient: jest.fn().mockResolvedValue(pool),
  } as unknown as ActionContext);

const rowsOf = (count: number): Row[] => Array.from({ length: count }, (_, id) => ({ id }));

describe('PostgresqlConnector', () => {
  let PostgresqlConnector: ConnectorSpec;
  let configSchema: NonNullable<ConnectorSpec['schema']>;

  beforeEach(() => {
    ({ PostgresqlConnector } = require('./postgresql'));
    if (!PostgresqlConnector.schema) {
      throw new Error('PostgreSQL spec is missing a config schema');
    }
    configSchema = PostgresqlConnector.schema;
  });

  describe('metadata', () => {
    it('has the correct connector id and display name', () => {
      expect(PostgresqlConnector.metadata.id).toBe('.postgresql');
      expect(PostgresqlConnector.metadata.displayName).toBe('PostgreSQL');
    });

    it('uses basic auth so credentials are encrypted, not stored in schema', () => {
      expect(PostgresqlConnector.auth?.types).toEqual(['basic']);
      expect(configSchema.shape).not.toHaveProperty('username');
      expect(configSchema.shape).not.toHaveProperty('password');
    });

    it('supports agentBuilder only', () => {
      expect(PostgresqlConnector.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('keeps the test button enabled', () => {
      expect(PostgresqlConnector.test?.enabled).toBe(true);
    });
  });

  describe('schema', () => {
    it('accepts a fully populated config', () => {
      expect(configSchema.safeParse(makeConfig()).success).toBe(true);
    });

    it('defaults port to 5432 and ssl to required', () => {
      const config = makeConfig();
      delete (config as Record<string, unknown>).port;
      delete (config as Record<string, unknown>).ssl;
      expect(configSchema.parse(config)).toMatchObject({ port: 5432, ssl: 'required' });
    });

    it('rejects an out-of-range port', () => {
      expect(configSchema.safeParse(makeConfig({ port: 70000 })).success).toBe(false);
    });

    it('rejects a host with a protocol prefix', () => {
      expect(
        configSchema.safeParse(makeConfig({ host: 'postgres://db.example.com' })).success
      ).toBe(false);
    });

    it('rejects an unknown ssl mode', () => {
      expect(configSchema.safeParse(makeConfig({ ssl: 'verify-full' })).success).toBe(false);
    });

    it.each(['host', 'database'])('rejects a config missing %s', (field) => {
      const config = makeConfig();
      delete (config as Record<string, unknown>)[field];
      expect(configSchema.safeParse(config).success).toBe(false);
    });
  });

  describe('tool exposure and scope', () => {
    const readActions = [
      'query',
      'listDatabases',
      'listTables',
      'describeTable',
      'getSchema',
      'searchRows',
    ];

    it.each(readActions)('%s is an agent-facing read tool', (name) => {
      expect(PostgresqlConnector.actions[name].isTool).toBe(true);
      expect(PostgresqlConnector.actions[name].scope).toBe('read');
    });

    it('executeSql is workflow-only and destroy scope', () => {
      expect(PostgresqlConnector.actions.executeSql.isTool).toBe(false);
      expect(PostgresqlConnector.actions.executeSql.scope).toBe('destroy');
    });
  });

  describe('input bounds', () => {
    it('rejects oversized sql', () => {
      const result = PostgresqlConnector.actions.query.input?.safeParse({ sql: 'x'.repeat(10001) });
      expect(result?.success).toBe(false);
    });

    it('rejects maxRows above 1000', () => {
      const result = PostgresqlConnector.actions.query.input?.safeParse({
        sql: 'SELECT 1',
        maxRows: 1001,
      });
      expect(result?.success).toBe(false);
    });

    it('rejects identifiers longer than PostgreSQL allows', () => {
      const result = PostgresqlConnector.actions.describeTable.input?.safeParse({
        table: 'x'.repeat(64),
      });
      expect(result?.success).toBe(false);
    });

    it('rejects an empty searchRows column list', () => {
      const result = PostgresqlConnector.actions.searchRows.input?.safeParse({
        table: 'customers',
        searchTerm: 'x',
        columns: [],
      });
      expect(result?.success).toBe(false);
    });
  });

  describe('read-only execution', () => {
    it('wraps every read in a read-only transaction that is rolled back and released', async () => {
      const { pool, client, statements } = makePool([{ rows: rowsOf(1) }]);
      const ctx = makeContext(pool);

      await PostgresqlConnector.actions.query.handler(ctx, { sql: 'SELECT id FROM t' });

      expect(ctx.getClient).toHaveBeenCalledWith('postgresql');
      expect(statements.map(({ text }) => text)).toEqual([
        'BEGIN READ ONLY',
        expect.stringContaining('SELECT id FROM t'),
        'ROLLBACK',
      ]);
      expect(client.release).toHaveBeenCalledWith(false);
    });

    it('rolls back and releases the connection when the statement fails', async () => {
      const { pool, client, statements } = makePool([{ error: new Error('boom') }]);

      await expect(
        PostgresqlConnector.actions.query.handler(makeContext(pool), { sql: 'SELECT 1' })
      ).rejects.toThrow('boom');

      expect(statements[statements.length - 1].text).toBe('ROLLBACK');
      expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('handles a connection error on the checked-out client and destroys the connection', async () => {
      const { pool, client } = makePool([{ rows: [] }]);
      const ctx = makeContext(pool);
      client.query.mockImplementationOnce(async () => ({})); // BEGIN READ ONLY
      client.query.mockImplementationOnce(async () => {
        // An EventEmitter with no 'error' listener throws here, which would crash the process.
        client.emit('error', new Error('connection terminated'));
        throw new Error('connection terminated');
      });

      await expect(
        PostgresqlConnector.actions.query.handler(ctx, { sql: 'SELECT 1' })
      ).rejects.toThrow('connection terminated');

      expect(ctx.log.warn).toHaveBeenCalledWith(expect.stringContaining('connection terminated'));
      expect(client.release).toHaveBeenCalledWith(true);
      expect(client.listenerCount('error')).toBe(0);
    });

    it('destroys the connection instead of pooling it when the rollback fails', async () => {
      const { pool, client } = makePool([{ rows: [] }], { rollbackFails: true });

      await PostgresqlConnector.actions.query.handler(makeContext(pool), { sql: 'SELECT 1' });

      expect(client.release).toHaveBeenCalledWith(true);
    });
  });

  describe('query action', () => {
    it('wraps the statement so the row limit is a bound parameter', async () => {
      const { pool, sent } = makePool([{ rows: rowsOf(2) }]);

      const result = await PostgresqlConnector.actions.query.handler(makeContext(pool), {
        sql: 'SELECT id FROM public.customers',
        maxRows: 50,
      });

      expect(sent()).toEqual([
        {
          text: 'SELECT * FROM (\nSELECT id FROM public.customers\n) AS kibana_query LIMIT $1',
          values: [51],
        },
      ]);
      expect(result).toEqual({ rows: rowsOf(2), rowCount: 2, truncated: false });
    });

    it('defaults to 100 rows and flags truncation when more exist', async () => {
      const { pool, sent } = makePool([{ rows: rowsOf(101) }]);

      const result = (await PostgresqlConnector.actions.query.handler(makeContext(pool), {
        sql: 'SELECT id FROM big',
      })) as { rows: Row[]; rowCount: number; truncated: boolean };

      expect(sent()[0].values).toEqual([101]);
      expect(result.rowCount).toBe(100);
      expect(result.rows).toHaveLength(100);
      expect(result.truncated).toBe(true);
    });

    it('stops retaining rows once the Actions maximum response size is reached', async () => {
      const { pool } = makePool([
        { rows: Array.from({ length: 50 }, () => ({ v: 'x'.repeat(98) })) },
      ]);
      // Each row serializes to 106 bytes.
      setResponseLimit(pool, 106 * 10);

      const result = (await PostgresqlConnector.actions.query.handler(makeContext(pool), {
        sql: 'SELECT v FROM wide',
      })) as { rowCount: number; truncated: boolean };

      expect(result.rowCount).toBe(10);
      expect(result.truncated).toBe(true);
    });

    it.each(['SELECT 1', 'WITH x AS (SELECT 1 AS n) SELECT n FROM x', 'SELECT 1 AS a; -- done'])(
      'always sends %s as one wrapped statement with a bound row limit',
      async (sql) => {
        const { pool, sent } = makePool([{ rows: [] }]);

        await PostgresqlConnector.actions.query.handler(makeContext(pool), { sql });

        expect(sent()).toHaveLength(1);
        expect(sent()[0].text).toMatch(
          /^SELECT \* FROM \(\n[\s\S]+\n\) AS kibana_query LIMIT \$1$/
        );
        expect(sent()[0].values).toEqual([101]);
      }
    );

    it('accepts WITH queries', async () => {
      const { pool } = makePool([{ rows: [] }]);

      await expect(
        PostgresqlConnector.actions.query.handler(makeContext(pool), {
          sql: 'WITH x AS (SELECT 1 AS n) SELECT n FROM x',
        })
      ).resolves.toBeDefined();
    });

    it('drops a trailing semicolon so the statement can be wrapped', async () => {
      const { pool, sent } = makePool([{ rows: [] }]);

      await PostgresqlConnector.actions.query.handler(makeContext(pool), {
        sql: 'SELECT 1 AS a; -- done',
      });

      expect(sent()[0].text).toBe('SELECT * FROM (\nSELECT 1 AS a\n) AS kibana_query LIMIT $1');
    });

    it('ends the wrapped text with a newline so a trailing line comment cannot hide the limit', async () => {
      const { pool, sent } = makePool([{ rows: [] }]);

      await PostgresqlConnector.actions.query.handler(makeContext(pool), {
        sql: 'SELECT 1 -- explain',
      });

      expect(sent()[0].text).toBe(
        'SELECT * FROM (\nSELECT 1 -- explain\n) AS kibana_query LIMIT $1'
      );
    });

    describe('rejects writes before any connection is opened', () => {
      it.each([
        ['an INSERT', 'INSERT INTO t VALUES (1)'],
        ['a DELETE', 'DELETE FROM t'],
        ['a CREATE TABLE', 'CREATE TABLE x (a int)'],
        ['a SHOW', 'SHOW search_path'],
        ['a data-modifying CTE', 'WITH d AS (DELETE FROM t RETURNING *) SELECT * FROM d'],
        ['a second statement', 'SELECT 1; DELETE FROM t'],
        ['a write hidden behind a comment', 'SELECT 1; /* x */ DROP TABLE t'],
        ['a write hidden behind a nested comment', 'SELECT 1;/* a /* b */ c */DROP TABLE t'],
        ['a write after a dollar-quoted string', 'SELECT $$a$$; DROP TABLE t'],
        ['a COMMIT escape attempt', 'SELECT 1) AS t; COMMIT; DELETE FROM orders; --'],
      ])('%s', async (_label, sql) => {
        const { pool } = makePool();

        await expect(
          PostgresqlConnector.actions.query.handler(makeContext(pool), { sql })
        ).rejects.toThrow();
        expect(pool.connect).not.toHaveBeenCalled();
      });
    });

    describe('does not reject read-only queries that merely mention write keywords in literals', () => {
      it.each([
        ['a semicolon in a string', "SELECT 1 FROM t WHERE note = 'a; b'"],
        ['a write keyword in a string', "SELECT 1 FROM t WHERE note = 'please delete this'"],
        ['an escaped quote', "SELECT 1 FROM t WHERE note = 'it''s; delete me'"],
        ['a backslash-escaped E string', "SELECT E'a\\'; DROP TABLE t; --' AS v"],
        ['a quoted identifier', 'SELECT "delete me" FROM t'],
        ['a dollar-quoted string', 'SELECT $body$; DROP TABLE t; $body$ AS v'],
        ['a line comment', 'SELECT 1 -- drop table t\nFROM t'],
        ['a bound-parameter-style token', 'SELECT $1'],
      ])('%s', async (_label, sql) => {
        const { pool } = makePool([{ rows: [] }]);

        await expect(
          PostgresqlConnector.actions.query.handler(makeContext(pool), { sql })
        ).resolves.toBeDefined();
      });
    });
  });

  describe('listDatabases action', () => {
    it('reads non-template databases from pg_database', async () => {
      const { pool, sent } = makePool([{ rows: [{ name: 'testdb' }] }]);

      const result = await PostgresqlConnector.actions.listDatabases.handler(makeContext(pool), {});

      expect(sent()[0].text).toContain('pg_catalog.pg_database');
      expect(sent()[0].text).toContain('NOT datistemplate');
      expect(result).toEqual({ rows: [{ name: 'testdb' }], rowCount: 1, truncated: false });
    });
  });

  describe('listTables action', () => {
    it('passes a null schema filter when none is given', async () => {
      const { pool, sent } = makePool([{ rows: [] }]);

      await PostgresqlConnector.actions.listTables.handler(makeContext(pool), {});

      expect(sent()[0].values).toEqual([null]);
      expect(sent()[0].text).toContain("n.nspname NOT IN ('pg_catalog', 'information_schema')");
    });

    it('binds the schema filter as a parameter, never inlining it', async () => {
      const { pool, sent } = makePool([{ rows: [] }]);

      await PostgresqlConnector.actions.listTables.handler(makeContext(pool), {
        schema: "sales'; DROP TABLE x; --",
      });

      expect(sent()[0].values).toEqual(["sales'; DROP TABLE x; --"]);
      expect(sent()[0].text).not.toContain('DROP TABLE x');
    });
  });

  describe('describeTable action', () => {
    it('defaults to the public schema and assembles columns, constraints and indexes', async () => {
      const { pool, sent } = makePool([
        { rows: [{ oid: 16385, type: 'TABLE', comment: 'Orders' }] },
        { rows: [{ name: 'id', dataType: 'integer' }] },
        { rows: [{ name: 'orders_pkey', type: 'PRIMARY KEY', definition: 'PRIMARY KEY (id)' }] },
        { rows: [{ name: 'orders_pkey', isUnique: true }] },
      ]);

      const result = await PostgresqlConnector.actions.describeTable.handler(makeContext(pool), {
        table: 'orders',
      });

      expect(sent()[0].values).toEqual(['public', 'orders']);
      // The remaining lookups key off the resolved oid, not off the user-supplied names.
      expect(
        sent()
          .slice(1)
          .map(({ values }) => values)
      ).toEqual([[16385], [16385], [16385]]);
      expect(result).toEqual({
        schema: 'public',
        table: 'orders',
        type: 'TABLE',
        comment: 'Orders',
        columns: [{ name: 'id', dataType: 'integer' }],
        constraints: [{ name: 'orders_pkey', type: 'PRIMARY KEY', definition: 'PRIMARY KEY (id)' }],
        indexes: [{ name: 'orders_pkey', isUnique: true }],
      });
    });

    it('uses the requested schema', async () => {
      const { pool, sent } = makePool([
        { rows: [{ oid: 1, type: 'VIEW', comment: null }] },
        { rows: [] },
      ]);

      await PostgresqlConnector.actions.describeTable.handler(makeContext(pool), {
        table: 'v',
        schema: 'sales',
      });

      expect(sent()[0].values).toEqual(['sales', 'v']);
    });

    it('explains how to recover when the table does not exist', async () => {
      const { pool } = makePool([{ rows: [] }]);

      await expect(
        PostgresqlConnector.actions.describeTable.handler(makeContext(pool), { table: 'nope' })
      ).rejects.toThrow('public.nope was not found. Use listTables');
    });
  });

  describe('getSchema action', () => {
    it('groups columns by table', async () => {
      const { pool, sent } = makePool([
        {
          rows: [
            {
              table: 'a',
              type: 'TABLE',
              column: 'id',
              dataType: 'integer',
              isNullable: false,
              isPrimaryKey: true,
            },
            {
              table: 'a',
              type: 'TABLE',
              column: 'name',
              dataType: 'text',
              isNullable: true,
              isPrimaryKey: false,
            },
            {
              table: 'v',
              type: 'VIEW',
              column: 'id',
              dataType: 'integer',
              isNullable: true,
              isPrimaryKey: false,
            },
          ],
        },
      ]);

      const result = await PostgresqlConnector.actions.getSchema.handler(makeContext(pool), {});

      expect(sent()[0].values).toEqual(['public']);
      expect(result).toEqual({
        schema: 'public',
        truncated: false,
        tables: [
          {
            name: 'a',
            type: 'TABLE',
            columns: [
              { name: 'id', dataType: 'integer', isNullable: false, isPrimaryKey: true },
              { name: 'name', dataType: 'text', isNullable: true, isPrimaryKey: false },
            ],
          },
          {
            name: 'v',
            type: 'VIEW',
            columns: [{ name: 'id', dataType: 'integer', isNullable: true, isPrimaryKey: false }],
          },
        ],
      });
    });

    it('explains how to recover when the schema has no readable tables', async () => {
      const { pool } = makePool([{ rows: [] }]);

      await expect(
        PostgresqlConnector.actions.getSchema.handler(makeContext(pool), { schema: 'Sales' })
      ).rejects.toThrow('Schema Sales was not found or has no readable tables. Use listTables');
    });

    it('flags truncation when the schema has more columns than the cap', async () => {
      const rows = Array.from({ length: 2001 }, (_, i) => ({
        table: `t${i}`,
        type: 'TABLE',
        column: 'id',
        dataType: 'integer',
        isNullable: false,
        isPrimaryKey: false,
      }));
      const { pool } = makePool([{ rows }]);
      // The default Actions limit would trim the rows first; this test is about the column cap.
      setResponseLimit(pool, 100 * 1024 * 1024);

      const result = (await PostgresqlConnector.actions.getSchema.handler(makeContext(pool), {
        schema: 'big',
      })) as { tables: unknown[]; truncated: boolean };

      expect(result.truncated).toBe(true);
      // The last table may have been cut mid-way, so it is left out.
      expect(result.tables).toHaveLength(1999);
    });
  });

  describe('searchRows action', () => {
    it('searches the text form of each column with ILIKE and a bound, escaped pattern', async () => {
      const { pool, sent } = makePool([{ rows: [{ id: 1 }] }]);

      await PostgresqlConnector.actions.searchRows.handler(makeContext(pool), {
        table: 'customers',
        searchTerm: '100%_x!',
        columns: ['name', 'email'],
        maxRows: 5,
      });

      expect(sent()).toEqual([
        {
          text:
            `SELECT * FROM "public"."customers" WHERE "name"::text ILIKE $1 ESCAPE '!' ` +
            `OR "email"::text ILIKE $1 ESCAPE '!' LIMIT $2`,
          values: ['%100!%!_x!!%', 6],
        },
      ]);
    });

    it('quotes identifiers so they cannot break out of the statement', async () => {
      const { pool, sent } = makePool([{ rows: [] }]);

      await PostgresqlConnector.actions.searchRows.handler(makeContext(pool), {
        table: 'ta"ble',
        schema: 'sch"ema',
        searchTerm: 'x',
        columns: ['co"l'],
      });

      expect(sent()[0].text).toContain('"sch""ema"."ta""ble"');
      expect(sent()[0].text).toContain('"co""l"::text ILIKE');
    });

    it('defaults to 100 rows and flags truncation', async () => {
      const { pool, sent } = makePool([{ rows: rowsOf(101) }]);

      const result = (await PostgresqlConnector.actions.searchRows.handler(makeContext(pool), {
        table: 't',
        searchTerm: 'x',
        columns: ['c'],
      })) as { rowCount: number; truncated: boolean };

      expect(sent()[0].values?.[1]).toBe(101);
      expect(result).toMatchObject({ rowCount: 100, truncated: true });
    });
  });

  describe('executeSql action', () => {
    it('runs the statement as-is, outside the read-only transaction', async () => {
      const { pool, statements } = makePool([{ command: 'INSERT', rowCount: 3, rows: [] }]);

      const result = await PostgresqlConnector.actions.executeSql.handler(makeContext(pool), {
        sql: 'INSERT INTO t SELECT 1',
      });

      expect(pool.connect).not.toHaveBeenCalled();
      expect(statements).toEqual([{ text: 'INSERT INTO t SELECT 1' }]);
      expect(result).toEqual({
        results: [{ command: 'INSERT', rowCount: 3, rows: [], truncated: false }],
      });
    });

    it('returns one result per statement when several are sent', async () => {
      const { pool } = makePool();
      pool.query.mockResolvedValueOnce([
        { command: 'CREATE', rowCount: null, rows: [] },
        { command: 'SELECT', rowCount: 1, rows: [{ a: 1 }] },
      ] as never);

      const result = await PostgresqlConnector.actions.executeSql.handler(makeContext(pool), {
        sql: 'CREATE TABLE x(a int); SELECT 1 AS a',
      });

      expect(result).toEqual({
        results: [
          { command: 'CREATE', rowCount: null, rows: [], truncated: false },
          { command: 'SELECT', rowCount: 1, rows: [{ a: 1 }], truncated: false },
        ],
      });
    });

    it('returns at most 1000 rows per statement and flags truncation', async () => {
      const { pool } = makePool([{ command: 'SELECT', rowCount: 1500, rows: rowsOf(1500) }]);
      setResponseLimit(pool, 100 * 1024 * 1024);

      const result = (await PostgresqlConnector.actions.executeSql.handler(makeContext(pool), {
        sql: 'SELECT id FROM big',
      })) as { results: Array<{ rows: Row[]; rowCount: number; truncated: boolean }> };

      expect(result.results[0].rows).toHaveLength(1000);
      expect(result.results[0].rowCount).toBe(1500);
      expect(result.results[0].truncated).toBe(true);
    });
  });

  describe('test handler', () => {
    it('verifies the connection with a lightweight read-only query', async () => {
      const { pool, sent } = makePool([{ rows: [{ ok: 1 }] }]);

      const result = await PostgresqlConnector.test?.handler(makeContext(pool));

      expect(sent()[0].text).toBe('SELECT 1 AS ok');
      expect(result).toEqual({ message: 'Successfully connected to PostgreSQL' });
    });
  });
});
