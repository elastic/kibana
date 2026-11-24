/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
import { Query } from 'pg';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { setResponseLimit } from '../../lib/clients/postgresql_response_limit';

type Row = Record<string, unknown>;

interface ScriptedResult {
  rows?: Row[];
  error?: Error;
  /** Raised by the first FETCH, like a runtime error PostgreSQL reports while producing rows. */
  fetchError?: Error;
  rowCount?: number | null;
  command?: string;
  /** Results of a multi-statement string, one per statement. */
  statements?: ScriptedResult[];
}

// The submitted Query object, with the fields node-postgres sets on it.
type SubmittedQuery = Query & {
  text: string;
  callback: (error: Error | null, result?: unknown) => void;
};

const SESSION_CONTROL = ['BEGIN READ ONLY', 'ROLLBACK', 'DISCARD ALL'];

// Each statement sent through the checked-out client consumes the next scripted result for non-session-control
// statements; BEGIN/ROLLBACK/DISCARD ALL are recorded but always succeed unless `rollbackFails` or
// `discardFails` is set.
const makePool = (
  results: ScriptedResult[] = [{}],
  { rollbackFails = false, discardFails = false } = {}
) => {
  const queue = [...results];
  // Consumes the next scripted result; the last one repeats.
  const nextResult = (): ScriptedResult => (queue.length > 1 ? queue.shift() ?? {} : queue[0]);
  const statements: Array<{ text: string; values?: unknown[] }> = [];
  const cursors = new Map<string, { rows: Row[]; fetchError?: Error }>();
  const client = Object.assign(new EventEmitter(), {
    query: jest.fn(async (arg: string | { text: string; values?: unknown[] } | SubmittedQuery) => {
      if (arg instanceof Query) {
        // executeSql submits a Query object: its rows arrive as 'row' events, and the callback reports the outcome.
        const submitted = arg as SubmittedQuery;
        statements.push({ text: submitted.text });
        const next = nextResult();
        if (next.error) {
          submitted.callback(next.error);
          return submitted;
        }
        const parts = next.statements ?? [next];
        const outcomes = parts.map((part) => ({
          command: part.command ?? 'SELECT',
          rowCount: part.rowCount === undefined ? part.rows?.length ?? null : part.rowCount,
          rows: [] as Row[],
        }));
        parts.forEach(({ rows = [] }, index) =>
          rows.forEach((row) => {
            submitted.emit('row', row, outcomes[index]);
            // The driver also accumulates the row when a callback is set.
            outcomes[index].rows.push(row);
          })
        );
        submitted.callback(null, outcomes.length > 1 ? outcomes : outcomes[0]);
        return submitted;
      }
      const statement = typeof arg === 'string' ? { text: arg } : arg;
      statements.push(statement);
      if (statement.text === 'BEGIN READ ONLY') return {};
      if (statement.text === 'ROLLBACK') {
        if (rollbackFails) throw new Error('connection lost');
        return {};
      }
      if (statement.text === 'DISCARD ALL') {
        if (discardFails) throw new Error('connection lost');
        return {};
      }
      // Reads go through a cursor: DECLARE consumes the scripted result, FETCH serves its rows in batches.
      const declare = /^DECLARE (\S+) NO SCROLL CURSOR FOR ([\s\S]*)$/.exec(statement.text);
      if (declare) {
        statements.pop();
        statements.push({ ...statement, text: declare[2] });
        const next = nextResult();
        if (next.error) throw next.error;
        cursors.set(declare[1], { rows: [...(next.rows ?? [])], fetchError: next.fetchError });
        return {};
      }
      const fetch = /^FETCH (\d+) FROM (\S+)$/.exec(statement.text);
      if (fetch) {
        const cursor = cursors.get(fetch[2]);
        if (cursor?.fetchError) throw cursor.fetchError;
        return { rows: (cursor?.rows ?? []).splice(0, Number(fetch[1])) };
      }
      const next = nextResult();
      if (next.error) throw next.error;
      return Array.isArray(next.rows) && next.command === undefined
        ? { command: 'SELECT', rowCount: next.rows.length, rows: next.rows }
        : { command: next.command, rowCount: next.rowCount ?? null, rows: next.rows ?? [] };
    }),
    release: jest.fn(),
  });
  const pool = { connect: jest.fn().mockResolvedValue(client) };
  /** Statements that were not session control, in order. */
  const sent = () =>
    statements.filter(({ text }) => !SESSION_CONTROL.includes(text) && !text.startsWith('FETCH '));
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

    it.each(['/var/run/postgresql', '/tmp'])(
      'rejects the Unix socket path %s that node-postgres would connect to',
      (host) => {
        expect(configSchema.safeParse(makeConfig({ host })).success).toBe(false);
      }
    );

    it.each(['db.example.com', '10.0.0.5', '::1'])('accepts the host %s', (host) => {
      expect(configSchema.safeParse(makeConfig({ host })).success).toBe(true);
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

    it('rejects identifiers that fit in 63 characters but not in 63 bytes', () => {
      // 40 two-byte characters: 80 bytes, which PostgreSQL would silently truncate.
      const table = 'é'.repeat(40);
      expect(PostgresqlConnector.actions.describeTable.input?.safeParse({ table }).success).toBe(
        false
      );
      expect(
        PostgresqlConnector.actions.describeTable.input?.safeParse({ table: 'é'.repeat(31) })
          .success
      ).toBe(true);
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
    it('wraps every read in a read-only transaction that is rolled back, reset and released', async () => {
      const { pool, client, statements } = makePool([{ rows: rowsOf(1) }]);
      const ctx = makeContext(pool);

      await PostgresqlConnector.actions.query.handler(ctx, { sql: 'SELECT id FROM t' });

      expect(ctx.getClient).toHaveBeenCalledWith('postgresql');
      expect(statements.map(({ text }) => text)).toEqual([
        'BEGIN READ ONLY',
        expect.stringContaining('SELECT id FROM t'),
        'FETCH 20 FROM kibana_cursor_0',
        'ROLLBACK',
        // Releases session-level state such as advisory locks, which ROLLBACK leaves in place.
        'DISCARD ALL',
      ]);
      expect(client.release).toHaveBeenCalledWith(false);
    });

    it('rolls back and releases the connection when the statement fails', async () => {
      const { pool, client, statements } = makePool([{ error: new Error('boom') }]);

      await expect(
        PostgresqlConnector.actions.query.handler(makeContext(pool), { sql: 'SELECT 1' })
      ).rejects.toThrow('boom');

      expect(statements.slice(-2).map(({ text }) => text)).toEqual(['ROLLBACK', 'DISCARD ALL']);
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

    it('destroys the connection instead of pooling it when the session reset fails', async () => {
      const { pool, client } = makePool([{ rows: [] }], { discardFails: true });

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

    it('stops fetching from the cursor as soon as the response size is reached', async () => {
      const { pool, statements } = makePool([
        { rows: Array.from({ length: 100 }, () => ({ v: 'x'.repeat(98) })) },
      ]);
      // Each row serializes to 106 bytes, so only the first 5 rows fit and the first batch already overflows.
      setResponseLimit(pool, 106 * 5);

      const result = (await PostgresqlConnector.actions.query.handler(makeContext(pool), {
        sql: 'SELECT v FROM wide',
      })) as { rowCount: number; truncated: boolean };

      expect(result).toMatchObject({ rowCount: 5, truncated: true });
      // Only one batch of 20 rows was pulled from the server, not all 100.
      expect(statements.filter(({ text }) => text.startsWith('FETCH '))).toHaveLength(1);
    });

    const fetchSizes = (statements: Array<{ text: string }>) =>
      statements
        .map(({ text }) => /^FETCH (\d+) FROM /.exec(text)?.[1])
        .filter(Boolean)
        .map(Number);

    it('sizes later batches from the row width, so small rows need few round trips', async () => {
      const { pool, statements } = makePool([{ rows: rowsOf(45) }]);

      const result = (await PostgresqlConnector.actions.query.handler(makeContext(pool), {
        sql: 'SELECT id FROM t',
      })) as { rowCount: number; truncated: boolean };

      expect(result).toMatchObject({ rowCount: 45, truncated: false });
      // After the first 20 rows, the next batch asks for every row that could still be returned (100 - 20 + 1).
      expect(fetchSizes(statements)).toEqual([20, 81]);
    });

    it('shrinks batches as the response-size budget runs low', async () => {
      const { pool, statements } = makePool([
        { rows: Array.from({ length: 100 }, () => ({ v: 'x'.repeat(98) })) },
      ]);
      // Each row serializes to 106 bytes, so 30 rows fit: 20 in the first batch, then 10, then the one that overflows.
      setResponseLimit(pool, 106 * 30);

      const result = (await PostgresqlConnector.actions.query.handler(makeContext(pool), {
        sql: 'SELECT v FROM wide',
      })) as { rowCount: number; truncated: boolean };

      expect(result).toMatchObject({ rowCount: 30, truncated: true });
      expect(fetchSizes(statements)).toEqual([20, 10, 1]);
    });

    it('rolls back, resets and releases the session when a FETCH fails, and the next read works', async () => {
      const { pool, client, statements } = makePool([
        { rows: [], fetchError: new Error('division by zero') },
        { rows: rowsOf(1) },
      ]);
      const ctx = makeContext(pool);

      await expect(
        PostgresqlConnector.actions.query.handler(ctx, { sql: 'SELECT 1/0' })
      ).rejects.toThrow('division by zero');

      expect(statements.slice(-2).map(({ text }) => text)).toEqual(['ROLLBACK', 'DISCARD ALL']);
      expect(client.release).toHaveBeenCalledWith(false);

      await expect(
        PostgresqlConnector.actions.query.handler(ctx, { sql: 'SELECT id FROM t' })
      ).resolves.toMatchObject({ rowCount: 1, truncated: false });
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
        // The wrapper binds its own row limit as $1, so caller placeholders would silently receive it.
        ['a $1 placeholder', 'SELECT id FROM t WHERE id = $1'],
        ['a $2 placeholder', 'SELECT id FROM t WHERE a = $2 OR b = $10'],
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
        ['a placeholder-style token in a string', "SELECT '$1' AS v"],
        ['a placeholder-style token in a dollar-quoted string', 'SELECT $q$ $1 $q$ AS v'],
        ['a dollar sign inside an identifier', 'SELECT a$1 FROM t'],
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

    it('requires schema USAGE and any readable column, not only table-level SELECT', async () => {
      const { pool, sent } = makePool([{ rows: [] }]);

      await PostgresqlConnector.actions.listTables.handler(makeContext(pool), {});

      expect(sent()[0].text).toContain("has_schema_privilege(n.oid, 'USAGE')");
      expect(sent()[0].text).toContain("has_any_column_privilege(c.oid, 'SELECT')");
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
        truncated: false,
      });
    });

    it('runs its metadata queries in a single read-only session', async () => {
      const { pool, client, statements } = makePool([
        { rows: [{ oid: 1, type: 'TABLE', comment: null }] },
        { rows: [] },
      ]);

      await PostgresqlConnector.actions.describeTable.handler(makeContext(pool), { table: 't' });

      expect(pool.connect).toHaveBeenCalledTimes(1);
      expect(client.release).toHaveBeenCalledTimes(1);
      const texts = statements.map(({ text }) => text);
      expect(texts.filter((text) => text === 'BEGIN READ ONLY')).toHaveLength(1);
      expect(texts.slice(-2)).toEqual(['ROLLBACK', 'DISCARD ALL']);
    });

    it('rolls back and releases the session when the table does not exist', async () => {
      const { pool, client, statements } = makePool([{ rows: [] }]);

      await expect(
        PostgresqlConnector.actions.describeTable.handler(makeContext(pool), { table: 'nope' })
      ).rejects.toThrow('was not found');

      expect(statements.slice(-2).map(({ text }) => text)).toEqual(['ROLLBACK', 'DISCARD ALL']);
      expect(client.release).toHaveBeenCalledWith(false);
    });

    it('applies one response-size budget across all of its metadata queries', async () => {
      // The relation row serializes to 39 bytes and each of the other rows to 106 bytes.
      const { pool } = makePool([
        { rows: [{ oid: 1, type: 'TABLE', comment: null }] },
        { rows: [{ v: 'x'.repeat(98) }] },
        { rows: [{ v: 'x'.repeat(98) }] },
        { rows: [] },
      ]);
      setResponseLimit(pool, 39 + 106 + 10);

      const result = (await PostgresqlConnector.actions.describeTable.handler(makeContext(pool), {
        table: 't',
      })) as { columns: Row[]; constraints: Row[]; truncated: boolean };

      expect(result.columns).toHaveLength(1);
      // The columns used the budget up, so this query's row no longer fits.
      expect(result.constraints).toEqual([]);
      expect(result.truncated).toBe(true);
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
      expect(sent()[0].text).toContain("has_schema_privilege(n.oid, 'USAGE')");
      expect(sent()[0].text).toContain("has_column_privilege(c.oid, a.attnum, 'SELECT')");
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

      expect(statements).toEqual([{ text: 'INSERT INTO t SELECT 1' }]);
      expect(result).toEqual({
        results: [{ command: 'INSERT', rowCount: 3, rows: [], truncated: false }],
      });
    });

    it('destroys the connection afterwards so session state cannot leak into the pool', async () => {
      const { pool, client } = makePool([{ command: 'BEGIN', rowCount: null, rows: [] }]);

      await PostgresqlConnector.actions.executeSql.handler(makeContext(pool), { sql: 'BEGIN' });

      expect(client.release).toHaveBeenCalledWith(true);
    });

    it('destroys the connection and logs when the statement fails on a broken connection', async () => {
      const { pool, client } = makePool();
      const ctx = makeContext(pool);
      client.query.mockImplementationOnce(async (query) => {
        // An EventEmitter with no 'error' listener throws here, which would crash the process.
        client.emit('error', new Error('connection terminated'));
        (query as SubmittedQuery).callback(new Error('connection terminated'));
        return query as SubmittedQuery;
      });

      await expect(
        PostgresqlConnector.actions.executeSql.handler(ctx, { sql: 'DELETE FROM t' })
      ).rejects.toThrow('connection terminated');

      expect(ctx.log.warn).toHaveBeenCalledWith(expect.stringContaining('connection terminated'));
      expect(client.release).toHaveBeenCalledWith(true);
    });

    it('returns one result per statement when several are sent', async () => {
      const { pool } = makePool([
        {
          statements: [
            { command: 'CREATE', rowCount: null, rows: [] },
            { command: 'SELECT', rowCount: 1, rows: [{ a: 1 }] },
          ],
        },
      ]);

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

    it('does not keep the rows the driver accumulates, only the capped copy', async () => {
      const { pool, client } = makePool([{ command: 'SELECT', rows: rowsOf(500) }]);
      let driverRows: Row[] = [];
      client.query.mockImplementationOnce(async (query) => {
        const submitted = query as SubmittedQuery;
        const result = { command: 'SELECT', rowCount: 500, rows: [] as Row[] };
        rowsOf(500).forEach((row) => {
          submitted.emit('row', row, result);
          result.rows.push(row);
        });
        driverRows = result.rows;
        submitted.callback(null, result);
        return submitted;
      });

      await PostgresqlConnector.actions.executeSql.handler(makeContext(pool), {
        sql: 'SELECT id FROM t',
      });

      // The handler empties the driver's copy before each new row, so at most the latest row remains.
      expect(driverRows).toHaveLength(1);
    });

    it('applies one response-size budget across all statements', async () => {
      const statementRows = () => Array.from({ length: 10 }, () => ({ v: 'x'.repeat(98) }));
      const { pool } = makePool([
        {
          statements: [
            { command: 'SELECT', rowCount: 10, rows: statementRows() },
            { command: 'SELECT', rowCount: 10, rows: statementRows() },
          ],
        },
      ]);
      // Each row serializes to 106 bytes, so 15 rows fit across the two statements.
      setResponseLimit(pool, 106 * 15);

      const result = (await PostgresqlConnector.actions.executeSql.handler(makeContext(pool), {
        sql: 'SELECT v FROM a; SELECT v FROM b',
      })) as { results: Array<{ rows: Row[]; truncated: boolean }> };

      expect(result.results.map(({ rows }) => rows.length)).toEqual([10, 5]);
      expect(result.results.map(({ truncated }) => truncated)).toEqual([false, true]);
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
