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

interface MockConnection {
  execute: jest.Mock;
  close: jest.Mock;
  callTimeout?: number;
}

interface MockPool {
  getConnection: jest.Mock;
}

const createMock = (rows: unknown[] = []) => {
  const connection: MockConnection = {
    execute: jest.fn().mockResolvedValue({ rows, rowsAffected: 0 }),
    close: jest.fn().mockResolvedValue(undefined),
  };
  const pool: MockPool = { getConnection: jest.fn().mockResolvedValue(connection) };
  return { connection, pool };
};

const makeConfig = (overrides: Record<string, unknown> = {}) => ({
  host: 'db.example.com',
  port: 1521,
  serviceName: 'ORCLPDB1',
  ...overrides,
});

const makeContext = (pool: MockPool, config: Record<string, unknown> = makeConfig()) =>
  ({
    config,
    log: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
    getClient: jest.fn().mockResolvedValue(pool),
  } as unknown as ActionContext);

// The statement and binds of the nth execute call after SET TRANSACTION READ ONLY.
const executedSql = (connection: MockConnection, index = 1): string =>
  connection.execute.mock.calls[index][0];

describe('OracleConnector', () => {
  let OracleConnector: ConnectorSpec;
  let configSchema: NonNullable<ConnectorSpec['schema']>;

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

    it('enables the connector test', () => {
      expect(OracleConnector.test?.enabled).toBe(true);
    });
  });

  describe('schema', () => {
    it('accepts a fully populated config', () => {
      expect(configSchema.safeParse(makeConfig()).success).toBe(true);
    });

    it('defaults port to 1521 and TLS to required', () => {
      const config = makeConfig();
      delete (config as Record<string, unknown>).port;
      const result = configSchema.parse(config);
      expect(result.port).toBe(1521);
      expect(result.ssl).toBe('required');
    });

    it('rejects an out-of-range port', () => {
      expect(configSchema.safeParse(makeConfig({ port: 99999 })).success).toBe(false);
    });

    it('rejects a host with a protocol prefix', () => {
      expect(configSchema.safeParse(makeConfig({ host: 'tcps://db.example.com' })).success).toBe(
        false
      );
    });

    it.each([
      'db.example.com:1521/svc?ssl_server_dn_match=false#',
      'db.example.com/svc',
      'db.example.com?x=1',
      'db.example.com#',
      'user@db.example.com',
      'db.example.com:1521',
      'db example.com',
      '-db.example.com',
      '',
    ])('rejects host %p that could alter the connect string', (host) => {
      expect(configSchema.safeParse(makeConfig({ host })).success).toBe(false);
    });

    it.each(['db.example.com', 'localhost', '10.0.0.5', 'oracle_1.corp-net', '[2001:db8::1]'])(
      'accepts host %p',
      (host) => {
        expect(configSchema.safeParse(makeConfig({ host })).success).toBe(true);
      }
    );

    it.each(['host', 'serviceName'])('rejects a config missing %s', (field) => {
      const config = makeConfig();
      delete (config as Record<string, unknown>)[field];
      expect(configSchema.safeParse(config).success).toBe(false);
    });

    it.each(['ORCL/../x', 'svc name', 'svc?x=1', 'svc)(HOST=evil'])(
      'rejects service name %p that could alter the connect string',
      (serviceName) => {
        expect(configSchema.safeParse(makeConfig({ serviceName })).success).toBe(false);
      }
    );

    it.each(['ORCLPDB1', 'xepdb1.example.com', 'my-svc_1'])('accepts service name %p', (name) => {
      expect(configSchema.safeParse(makeConfig({ serviceName: name })).success).toBe(true);
    });
  });

  describe('tool exposure and scope', () => {
    const readActions = ['query', 'listSchemas', 'listTables', 'describeTable', 'searchRows'];

    it('marks read actions as agent-facing tools with read scope', () => {
      for (const name of readActions) {
        expect(OracleConnector.actions[name].isTool).toBe(true);
        expect(OracleConnector.actions[name].scope).toBe('read');
      }
    });

    it('keeps executeSql out of agent tools with destroy scope', () => {
      expect(OracleConnector.actions.executeSql.isTool).toBe(false);
      expect(OracleConnector.actions.executeSql.scope).toBe('destroy');
    });
  });

  describe('query action', () => {
    it('runs the SQL in a read-only transaction and returns rows', async () => {
      const { connection, pool } = createMock([{ ID: 1 }]);

      const result = await OracleConnector.actions.query.handler(makeContext(pool), {
        sql: 'SELECT id FROM hr.employees FETCH FIRST 5 ROWS ONLY',
      });

      expect(connection.execute.mock.calls[0][0]).toBe('SET TRANSACTION READ ONLY');
      expect(executedSql(connection)).toBe('SELECT id FROM hr.employees FETCH FIRST 5 ROWS ONLY');
      expect(result).toEqual({ rows: [{ ID: 1 }], truncated: false });
    });

    it('releases the connection even when the statement fails', async () => {
      const { connection, pool } = createMock();
      connection.execute
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('ORA-00942: table or view does not exist'));

      await expect(
        OracleConnector.actions.query.handler(makeContext(pool), { sql: 'SELECT * FROM nope' })
      ).rejects.toThrow(/ORA-00942/);
      expect(connection.close).toHaveBeenCalledTimes(1);
    });

    it('strips a trailing semicolon, which Oracle rejects', async () => {
      const { connection, pool } = createMock();

      await OracleConnector.actions.query.handler(makeContext(pool), {
        sql: 'SELECT 1 FROM dual;',
      });

      expect(executedSql(connection)).toBe('SELECT 1 FROM dual');
    });

    it('asks the driver for one row more than maxRows and reports truncation', async () => {
      const { connection, pool } = createMock([{ N: 1 }, { N: 2 }, { N: 3 }]);

      const result = await OracleConnector.actions.query.handler(makeContext(pool), {
        sql: 'SELECT n FROM t',
        maxRows: 2,
      });

      expect(connection.execute.mock.calls[1][2]).toEqual({ maxRows: 3 });
      expect(result).toEqual({ rows: [{ N: 1 }, { N: 2 }], truncated: true });
    });

    it('defaults to 100 rows', async () => {
      const { connection, pool } = createMock();

      await OracleConnector.actions.query.handler(makeContext(pool), { sql: 'SELECT 1 FROM dual' });

      expect(connection.execute.mock.calls[1][2]).toEqual({ maxRows: 101 });
    });

    it('stops adding rows once the Actions response size limit is reached', async () => {
      const { pool } = createMock([{ V: 'a'.repeat(40) }, { V: 'b'.repeat(40) }, { V: 'c' }]);
      setResponseLimit(pool, 60);

      const result = (await OracleConnector.actions.query.handler(makeContext(pool), {
        sql: 'SELECT v FROM t',
      })) as { rows: unknown[]; truncated: boolean };

      expect(result.rows).toEqual([{ V: 'a'.repeat(40) }]);
      expect(result.truncated).toBe(true);
    });

    it.each([
      ['a write', 'DROP TABLE hr.employees'],
      ['multi-statement SQL', 'SELECT 1 FROM dual; DROP TABLE t'],
      ['a write behind a comment', '-- fine\nDELETE FROM t'],
      ['a CTE that writes', 'WITH x AS (SELECT 1 FROM dual) INSERT INTO t SELECT * FROM x'],
      ['PL/SQL', 'BEGIN NULL; END'],
      ['SELECT FOR UPDATE', 'SELECT * FROM t FOR UPDATE'],
      ['SELECT FOR  UPDATE with extra whitespace', 'SELECT * FROM t FOR\n  UPDATE'],
      ['a DBMS package call', 'SELECT dbms_lock.sleep(100) FROM dual'],
      ['a UTL package call', "SELECT utl_http.request('http://internal') FROM dual"],
      ['HTTPURITYPE', "SELECT HTTPURITYPE('http://internal').getclob() FROM dual"],
    ])('rejects %s before leasing a connection', async (_label, sql) => {
      const { pool } = createMock();
      const ctx = makeContext(pool);

      await expect(OracleConnector.actions.query.handler(ctx, { sql })).rejects.toThrow();
      expect(ctx.getClient).not.toHaveBeenCalled();
    });

    it('accepts an optimizer hint and a WITH query', async () => {
      const { pool } = createMock();
      const ctx = makeContext(pool);

      await OracleConnector.actions.query.handler(ctx, {
        sql: 'WITH x AS (SELECT /*+ PARALLEL(4) */ id FROM t) SELECT * FROM x',
      });

      expect(ctx.getClient).toHaveBeenCalledWith('oracle');
    });
  });

  describe('listSchemas action', () => {
    it('excludes Oracle-maintained schemas', async () => {
      const { connection, pool } = createMock([{ SCHEMA_NAME: 'HR' }]);

      const result = await OracleConnector.actions.listSchemas.handler(makeContext(pool), {});

      expect(executedSql(connection)).toMatch(/oracle_maintained = 'N'/);
      expect(result).toEqual({ rows: [{ SCHEMA_NAME: 'HR' }], truncated: false });
    });
  });

  describe('listTables action', () => {
    it('binds the owner rather than interpolating it', async () => {
      const { connection, pool } = createMock();

      await OracleConnector.actions.listTables.handler(makeContext(pool), {
        owner: "HR' OR '1'='1",
      });

      expect(executedSql(connection)).not.toContain('HR');
      expect(connection.execute.mock.calls[1][1]).toEqual({ owner: "HR' OR '1'='1" });
    });

    it('falls back to the connected user schema when owner is omitted', async () => {
      const { connection, pool } = createMock();

      await OracleConnector.actions.listTables.handler(makeContext(pool), {});

      expect(connection.execute.mock.calls[1][1]).toEqual({ owner: null });
      expect(executedSql(connection)).toContain("SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA')");
    });
  });

  describe('describeTable action', () => {
    it('returns columns and constraints for a table', async () => {
      const { connection, pool } = createMock();
      connection.execute
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [{ COLUMN_NAME: 'ID' }] })
        .mockResolvedValueOnce({ rows: [{ CONSTRAINT_TYPE: 'P' }] });

      const result = await OracleConnector.actions.describeTable.handler(makeContext(pool), {
        table: 'EMPLOYEES',
        owner: 'HR',
      });

      expect(result).toEqual({
        columns: [{ COLUMN_NAME: 'ID' }],
        constraints: [{ CONSTRAINT_TYPE: 'P' }],
      });
      expect(connection.execute.mock.calls[1][1]).toEqual({ owner: 'HR', tableName: 'EMPLOYEES' });
      expect(connection.execute.mock.calls[2][1]).toEqual({ owner: 'HR', tableName: 'EMPLOYEES' });
    });

    it('explains how to find the right name when the table does not exist', async () => {
      const { connection, pool } = createMock([]);
      const ctx = makeContext(pool);

      await expect(
        OracleConnector.actions.describeTable.handler(ctx, { table: 'employees' })
      ).rejects.toThrow(/listTables/);
      expect(connection.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchRows action', () => {
    it('quotes identifiers and binds the escaped search term', async () => {
      const { connection, pool } = createMock();

      await OracleConnector.actions.searchRows.handler(makeContext(pool), {
        table: 'EMPLOYEES',
        owner: 'HR',
        columns: ['LAST_NAME', 'EMAIL'],
        searchTerm: '50%_Off!',
      });

      expect(executedSql(connection)).toBe(
        `SELECT * FROM "HR"."EMPLOYEES" WHERE LOWER("LAST_NAME") LIKE :term ESCAPE '!' OR LOWER("EMAIL") LIKE :term ESCAPE '!'`
      );
      expect(connection.execute.mock.calls[1][1]).toEqual({ term: '%50!%!_off!!%' });
    });

    it('escapes double quotes so an identifier cannot break out of its quoting', async () => {
      const { connection, pool } = createMock();

      await OracleConnector.actions.searchRows.handler(makeContext(pool), {
        table: 'T"; DROP TABLE x; --',
        columns: ['C"D'],
        searchTerm: 'x',
      });

      expect(executedSql(connection)).toBe(
        `SELECT * FROM "T""; DROP TABLE x; --" WHERE LOWER("C""D") LIKE :term ESCAPE '!'`
      );
    });

    it('omits the schema qualifier when owner is not given', async () => {
      const { connection, pool } = createMock();

      await OracleConnector.actions.searchRows.handler(makeContext(pool), {
        table: 'EMPLOYEES',
        columns: ['EMAIL'],
        searchTerm: 'a',
      });

      expect(executedSql(connection)).toMatch(/^SELECT \* FROM "EMPLOYEES" WHERE/);
    });
  });

  describe('executeSql action', () => {
    it('commits a single statement without a read-only transaction', async () => {
      const { connection, pool } = createMock();
      connection.execute.mockResolvedValue({ rowsAffected: 3 });

      const result = await OracleConnector.actions.executeSql.handler(makeContext(pool), {
        sql: 'UPDATE t SET a = 1;',
      });

      expect(connection.execute).toHaveBeenCalledTimes(1);
      expect(connection.execute).toHaveBeenCalledWith(
        'UPDATE t SET a = 1',
        {},
        { autoCommit: true, maxRows: 100 }
      );
      expect(result).toEqual({ rowsAffected: 3, rows: undefined });
      expect(connection.close).toHaveBeenCalledTimes(1);
    });

    it('keeps the terminating semicolon of a PL/SQL block', async () => {
      const { connection, pool } = createMock();

      await OracleConnector.actions.executeSql.handler(makeContext(pool), {
        sql: 'BEGIN pkg.do_it; END;',
      });

      expect(connection.execute.mock.calls[0][0]).toBe('BEGIN pkg.do_it; END;');
    });
  });

  describe('connector test', () => {
    it('runs a lightweight query against DUAL', async () => {
      const { connection, pool } = createMock();

      const result = await OracleConnector.test?.handler(makeContext(pool));

      expect(executedSql(connection)).toBe('SELECT 1 FROM DUAL');
      expect(result).toEqual({ message: 'Successfully connected to Oracle' });
    });
  });
});
