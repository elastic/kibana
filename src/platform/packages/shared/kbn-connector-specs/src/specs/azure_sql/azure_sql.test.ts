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

interface ScriptedResult {
  rows?: Array<Record<string, unknown>>;
  errors?: Error[];
  rowsAffected?: number[];
  /** Makes the promise returned by query() reject, as the driver does for failures raised before any event. */
  queryRejection?: Error;
}

// Minimal stand-in for the mssql streaming Request: collects listeners and replays a script.
class MockRequest {
  private readonly handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
  public stream = false;
  public input = jest.fn();
  public cancel = jest.fn();
  public query: jest.Mock;

  public on(event: string, handler: (...args: never[]) => void): this {
    (this.handlers[event] = this.handlers[event] ?? []).push(handler as never);
    return this;
  }

  private emit(event: string, ...args: unknown[]): void {
    (this.handlers[event] ?? []).forEach((handler) => handler(...args));
  }

  constructor(result: ScriptedResult) {
    // Like the real driver, query() returns a promise even in stream mode.
    this.query = jest.fn(() => {
      if (result.queryRejection) {
        return Promise.reject(result.queryRejection);
      }
      setImmediate(() => {
        (result.rows ?? []).forEach((row) => this.emit('row', row));
        (result.errors ?? []).forEach((err) => this.emit('error', err));
        this.emit('done', { rowsAffected: result.rowsAffected ?? [] });
      });
      return Promise.resolve({});
    });
  }
}

// Each request() call consumes the next scripted result; the last one repeats.
const makePool = (...results: ScriptedResult[]) => {
  const requests: MockRequest[] = [];
  const pool = {
    request: jest.fn(() => {
      const request = new MockRequest(results[Math.min(requests.length, results.length - 1)]);
      requests.push(request);
      return request;
    }),
  };
  return { pool, requests };
};

const makeConfig = (overrides: Record<string, unknown> = {}) => ({
  host: 'myserver.database.windows.net',
  port: 1433,
  database: 'testdb',
  ...overrides,
});

const makeContext = (pool: unknown, config = makeConfig()): ActionContext =>
  ({
    config,
    log: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
    getClient: jest.fn().mockResolvedValue(pool),
  } as unknown as ActionContext);

const rowsOf = (count: number) => Array.from({ length: count }, (_, id) => ({ id }));

describe('AzureSql', () => {
  let AzureSql: ConnectorSpec;
  let configSchema: NonNullable<ConnectorSpec['schema']>;

  beforeEach(() => {
    ({ AzureSql } = require('./azure_sql'));
    if (!AzureSql.schema) {
      throw new Error('Azure SQL spec is missing a config schema');
    }
    configSchema = AzureSql.schema;
  });

  describe('metadata', () => {
    it('has the correct connector id and display name', () => {
      expect(AzureSql.metadata.id).toBe('.azure_sql');
      expect(AzureSql.metadata.displayName).toBe('Azure SQL');
    });

    it('uses basic auth so credentials are encrypted, not stored in schema', () => {
      expect(AzureSql.auth?.types).toEqual(['basic']);
      expect(configSchema.shape).not.toHaveProperty('username');
      expect(configSchema.shape).not.toHaveProperty('password');
    });

    it('supports agentBuilder only (workflows added in a follow-up)', () => {
      expect(AzureSql.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('keeps the test button enabled', () => {
      expect(AzureSql.test?.enabled).toBe(true);
    });
  });

  describe('schema', () => {
    it('accepts a fully populated config', () => {
      expect(configSchema.safeParse(makeConfig()).success).toBe(true);
    });

    it('defaults port to 1433', () => {
      const config = makeConfig();
      delete (config as Record<string, unknown>).port;
      expect(configSchema.parse(config).port).toBe(1433);
    });

    it('rejects an out-of-range port', () => {
      expect(configSchema.safeParse(makeConfig({ port: 70000 })).success).toBe(false);
    });

    it('rejects a host with a protocol prefix', () => {
      expect(
        configSchema.safeParse(makeConfig({ host: 'tcp://x.database.windows.net' })).success
      ).toBe(false);
    });

    it.each(['host', 'database'])('rejects a config missing %s', (field) => {
      const config = makeConfig();
      delete (config as Record<string, unknown>)[field];
      expect(configSchema.safeParse(config).success).toBe(false);
    });
  });

  describe('tool exposure and scope', () => {
    const readActions = ['query', 'listDatabases', 'listTables', 'describeTable', 'searchRows'];

    it.each(readActions)('%s is an agent-facing read tool', (name) => {
      expect(AzureSql.actions[name].isTool).toBe(true);
      expect(AzureSql.actions[name].scope).toBe('read');
    });

    it('executeSql is workflow-only and destroy scope', () => {
      expect(AzureSql.actions.executeSql.isTool).toBe(false);
      expect(AzureSql.actions.executeSql.scope).toBe('destroy');
    });
  });

  describe('input bounds', () => {
    it('rejects oversized sql', () => {
      const result = AzureSql.actions.query.input?.safeParse({ sql: 'x'.repeat(10001) });
      expect(result?.success).toBe(false);
    });

    it('rejects maxRows above 1000', () => {
      const result = AzureSql.actions.query.input?.safeParse({ sql: 'SELECT 1', maxRows: 1001 });
      expect(result?.success).toBe(false);
    });

    it('rejects an empty searchRows column list', () => {
      const result = AzureSql.actions.searchRows.input?.safeParse({
        table: 'Customers',
        searchTerm: 'x',
        columns: [],
      });
      expect(result?.success).toBe(false);
    });
  });

  describe('query action', () => {
    it('streams the statement as-is and returns the rows', async () => {
      const { pool, requests } = makePool({ rows: rowsOf(2) });
      const ctx = makeContext(pool);

      const result = await AzureSql.actions.query.handler(ctx, {
        sql: 'SELECT TOP 20 id FROM dbo.Customers',
      });

      expect(ctx.getClient).toHaveBeenCalledWith('mssql');
      expect(requests[0].stream).toBe(true);
      expect(requests[0].query).toHaveBeenCalledWith('SELECT TOP 20 id FROM dbo.Customers');
      expect(result).toEqual({ rows: rowsOf(2), rowCount: 2, rowsAffected: [], truncated: false });
    });

    it('defaults to 100 rows, cancels the request, and flags truncation', async () => {
      const { pool, requests } = makePool({ rows: rowsOf(250) });

      const result = (await AzureSql.actions.query.handler(makeContext(pool), {
        sql: 'SELECT id FROM big',
      })) as { rowCount: number; truncated: boolean };

      expect(result.rowCount).toBe(100);
      expect(result.truncated).toBe(true);
      expect(requests[0].cancel).toHaveBeenCalledTimes(1);
    });

    it('honours an explicit maxRows and returns exactly that many rows without truncation', async () => {
      const { pool, requests } = makePool({ rows: rowsOf(5) });

      const result = (await AzureSql.actions.query.handler(makeContext(pool), {
        sql: 'SELECT id FROM t',
        maxRows: 5,
      })) as { rowCount: number; truncated: boolean };

      expect(result.rowCount).toBe(5);
      expect(result.truncated).toBe(false);
      expect(requests[0].cancel).not.toHaveBeenCalled();
    });

    it('surfaces a driver error', async () => {
      const { pool } = makePool({ errors: [new Error("Invalid object name 'nope'.")] });

      await expect(
        AzureSql.actions.query.handler(makeContext(pool), { sql: 'SELECT * FROM nope' })
      ).rejects.toThrow("Invalid object name 'nope'.");
    });

    it('keeps the rows read so far when the error is our own cancellation', async () => {
      const { pool } = makePool({ rows: rowsOf(3), errors: [new Error('Canceled.')] });

      const result = (await AzureSql.actions.query.handler(makeContext(pool), {
        sql: 'SELECT id FROM t',
        maxRows: 2,
      })) as { rowCount: number; truncated: boolean };

      expect(result).toMatchObject({ rowCount: 2, truncated: true });
    });

    it('rejects instead of hanging when the driver fails before emitting any event', async () => {
      const { pool } = makePool({ queryRejection: new Error('Unsupported parameter type') });

      await expect(
        AzureSql.actions.query.handler(makeContext(pool), { sql: 'SELECT 1' })
      ).rejects.toThrow('Unsupported parameter type');
    });

    it('surfaces a real error that arrives after the row cap was hit', async () => {
      const { pool } = makePool({ rows: rowsOf(3), errors: [new Error('Connection reset')] });

      await expect(
        AzureSql.actions.query.handler(makeContext(pool), { sql: 'SELECT id FROM t', maxRows: 2 })
      ).rejects.toThrow('Connection reset');
    });

    describe('response size limit', () => {
      const wide = (id: number) => ({ id, text: 'x'.repeat(40) });

      it('stops retaining rows once the byte limit is reached, and cancels', async () => {
        const { pool, requests } = makePool({ rows: [wide(1), wide(2), wide(3), wide(4)] });
        setResponseLimit(pool, 130); // each row is ~58 bytes as JSON, so two fit

        const result = (await AzureSql.actions.query.handler(makeContext(pool), {
          sql: 'SELECT * FROM t',
        })) as { rows: unknown[]; truncated: boolean };

        expect(result.rows).toEqual([wide(1), wide(2)]);
        expect(result.truncated).toBe(true);
        expect(requests[0].cancel).toHaveBeenCalledTimes(1);
      });

      it('does not retain a single row larger than the limit, even with maxRows: 1', async () => {
        const { pool, requests } = makePool({ rows: [{ big: 'x'.repeat(5000) }] });
        setResponseLimit(pool, 1000);

        const result = (await AzureSql.actions.query.handler(makeContext(pool), {
          sql: "SELECT REPLICATE(CAST('x' AS varchar(max)), 5000) AS big",
          maxRows: 1,
        })) as { rows: unknown[]; truncated: boolean };

        expect(result.rows).toEqual([]);
        expect(result.truncated).toBe(true);
        expect(requests[0].cancel).toHaveBeenCalled();
      });

      it('measures bytes, not characters, so non-ASCII payloads count in full', async () => {
        // 20 CJK characters are 20 string characters but 60 UTF-8 bytes (plus JSON overhead).
        const { pool } = makePool({ rows: [{ t: 'あ'.repeat(20) }] });
        setResponseLimit(pool, 50);

        const result = (await AzureSql.actions.query.handler(makeContext(pool), {
          sql: 'SELECT t FROM x',
        })) as { rows: unknown[]; truncated: boolean };

        expect(result.rows).toEqual([]);
        expect(result.truncated).toBe(true);
      });

      it('falls back to the 1 MiB Actions default when no limit was recorded', async () => {
        const { pool } = makePool({ rows: [{ t: 'x'.repeat(2 * 1024 * 1024) }] });

        const result = (await AzureSql.actions.query.handler(makeContext(pool), {
          sql: 'SELECT t FROM x',
        })) as { rows: unknown[]; truncated: boolean };

        expect(result.rows).toEqual([]);
        expect(result.truncated).toBe(true);
      });
    });

    it.each([
      ['DROP TABLE Customers', /read-only/i],
      ['SELECT 1; DROP TABLE Customers', /multi-statement/i],
      ['SELECT 1 DELETE FROM Customers', /not permitted/i],
      ['EXEC sp_who', /read-only/i],
    ])('rejects %j before leasing a connection', async (sql, message) => {
      const { pool } = makePool({});
      const ctx = makeContext(pool);

      await expect(AzureSql.actions.query.handler(ctx, { sql })).rejects.toThrow(message);
      expect(ctx.getClient).not.toHaveBeenCalled();
    });

    // T-SQL write paths the shared MySQL guard alone lets through. Not exhaustive by design.
    it.each([
      'SELECT Id INTO dbo.CustomerCopy FROM dbo.Customers',
      "SELECT 1 EXEC(N'DRO' + N'P TABLE dbo.Customers')",
      'SELECT 1 EXECUTE sp_who',
      'SELECT 1 INSERT dbo.Customers (Name) VALUES (1)',
      'SELECT 1 MERGE dbo.Customers USING dbo.Other ON 1 = 0 WHEN NOT MATCHED THEN INSERT DEFAULT VALUES',
      "SELECT * FROM OPENROWSET('SQLNCLI', 'Server=x', 'SELECT 1')",
      "SELECT * FROM OPENQUERY(linked, 'SELECT 1')",
      "SELECT 1 WAITFOR DELAY '00:00:30'",
    ])('rejects the T-SQL write form %j before leasing a connection', async (sql) => {
      const { pool } = makePool({});
      const ctx = makeContext(pool);

      await expect(AzureSql.actions.query.handler(ctx, { sql })).rejects.toThrow(
        /write operations are not permitted/i
      );
      expect(ctx.getClient).not.toHaveBeenCalled();
    });

    // Keywords that are data or names, not statements, must not be mistaken for writes.
    it.each([
      "SELECT * FROM dbo.AuditLog WHERE Action = 'INSERT'",
      'SELECT [Merge], [Into], [Insert] FROM dbo.Settings',
      'SELECT "Exec" FROM dbo.Settings',
      "SELECT 'it''s an INSERT; or a DELETE FROM x' AS note",
      'SELECT 1 /* DELETE FROM Customers */',
      'SELECT 1 /* outer /* nested INSERT */ still a comment */',
      'SELECT 1 -- INSERT INTO Customers\nFROM dbo.Orders',
      'SELECT [odd]]name] FROM dbo.Settings',
    ])('allows a keyword inside a literal, quoted identifier, or comment: %j', async (sql) => {
      const { pool } = makePool({ rows: rowsOf(1) });

      await expect(
        AzureSql.actions.query.handler(makeContext(pool), { sql })
      ).resolves.toBeDefined();
    });

    // A comment or bracket stands in for the whitespace a keyword needs; none of these hide a write.
    it.each([
      'SELECT 1 DROP/**/TABLE dbo.Customers',
      'SELECT 1 DELETE[dbo].[Customers]',
      'SELECT 1 UPDATE[dbo].[Customers]SET[Email]=NULL',
      'SELECT 1 TRUNCATE/**/TABLE dbo.Orders',
      'WITH c AS (SELECT * FROM dbo.Orders) DELETE/**/FROM c',
      "SELECT '/*' DELETE FROM Customers --*/",
      "SELECT '--' DELETE FROM Customers",
      "SELECT [it's] DELETE FROM Customers",
      "SELECT 'it''s' DELETE FROM Customers",
      'SELECT 1 /* a /* b */ */ DELETE FROM Customers',
    ])('still rejects a write hidden by comments or quoting: %j', async (sql) => {
      const { pool } = makePool({});
      const ctx = makeContext(pool);

      await expect(AzureSql.actions.query.handler(ctx, { sql })).rejects.toThrow(/not permitted/i);
      expect(ctx.getClient).not.toHaveBeenCalled();
    });

    it.each([
      'SELECT UpdatedAt, CreatedBy, Interval FROM dbo.Audit',
      'SELECT TOP 10 * FROM dbo.Customers ORDER BY Id',
      'WITH recent AS (SELECT * FROM dbo.Orders) SELECT * FROM recent',
      'SELECT c.Name, COUNT(*) FROM dbo.Customers c GROUP BY c.Name',
    ])('still allows the read-only query %j', async (sql) => {
      const { pool } = makePool({ rows: rowsOf(1) });

      await expect(
        AzureSql.actions.query.handler(makeContext(pool), { sql })
      ).resolves.toBeDefined();
    });
  });

  describe('listDatabases action', () => {
    it('reads sys.databases', async () => {
      const { pool, requests } = makePool({ rows: [{ name: 'master' }] });

      await AzureSql.actions.listDatabases.handler(makeContext(pool), {});

      expect(requests[0].query.mock.calls[0][0]).toContain('FROM sys.databases');
    });
  });

  describe('listTables action', () => {
    it('lists all schemas without a filter by default', async () => {
      const { pool, requests } = makePool({ rows: [] });

      await AzureSql.actions.listTables.handler(makeContext(pool), {});

      expect(requests[0].query.mock.calls[0][0]).not.toContain('WHERE');
      expect(requests[0].input).not.toHaveBeenCalled();
    });

    it('binds the schema filter as a parameter, never in the SQL text', async () => {
      const { pool, requests } = makePool({ rows: [] });

      await AzureSql.actions.listTables.handler(makeContext(pool), { schema: "x'; DROP TABLE y" });

      expect(requests[0].query.mock.calls[0][0]).toContain('WHERE TABLE_SCHEMA = @schema');
      expect(requests[0].query.mock.calls[0][0]).not.toContain('DROP');
      expect(requests[0].input).toHaveBeenCalledWith('schema', "x'; DROP TABLE y");
    });
  });

  describe('describeTable action', () => {
    const columns = [{ name: 'Id', dataType: 'int' }];

    it('returns columns, constraints and foreign keys, defaulting to dbo', async () => {
      const constraints = [{ name: 'PK_Customers', type: 'PRIMARY KEY', columnName: 'Id' }];
      const foreignKeys = [{ name: 'FK_Orders_Customers', referencedTable: 'Customers' }];
      const { pool, requests } = makePool(
        { rows: columns },
        { rows: constraints },
        { rows: foreignKeys }
      );

      const result = await AzureSql.actions.describeTable.handler(makeContext(pool), {
        table: 'Orders',
      });

      expect(result).toEqual({ schema: 'dbo', table: 'Orders', columns, constraints, foreignKeys });
      expect(requests[0].input).toHaveBeenCalledWith('schema', 'dbo');
      expect(requests[0].input).toHaveBeenCalledWith('table', 'Orders');
    });

    it('bracket-quotes the name passed to OBJECT_ID so a "]" cannot break out', async () => {
      const { pool, requests } = makePool({ rows: columns }, { rows: [] }, { rows: [] });

      await AzureSql.actions.describeTable.handler(makeContext(pool), {
        table: 'we]ird',
        schema: 'sales',
      });

      expect(requests[2].input).toHaveBeenCalledWith('qualifiedName', '[sales].[we]]ird]');
    });

    it('throws a helpful error when the table has no columns', async () => {
      const { pool } = makePool({ rows: [] });

      await expect(
        AzureSql.actions.describeTable.handler(makeContext(pool), { table: 'Missing' })
      ).rejects.toThrow(/dbo\.Missing was not found.*listTables/);
    });
  });

  describe('searchRows action', () => {
    it('builds a parameterised LIKE per column with bracket-quoted identifiers', async () => {
      const { pool, requests } = makePool({ rows: [] });

      await AzureSql.actions.searchRows.handler(makeContext(pool), {
        table: 'Customers',
        searchTerm: 'Smith',
        columns: ['Name', 'E]mail'],
      });

      const sql = requests[0].query.mock.calls[0][0] as string;
      expect(sql).toBe(
        "SELECT TOP (101) * FROM [dbo].[Customers] WHERE LOWER([Name]) LIKE @pattern ESCAPE '!' " +
          "OR LOWER([E]]mail]) LIKE @pattern ESCAPE '!'"
      );
      expect(requests[0].input).toHaveBeenCalledWith('pattern', '%smith%');
    });

    it('escapes LIKE wildcards in the search term, including [', async () => {
      const { pool, requests } = makePool({ rows: [] });

      await AzureSql.actions.searchRows.handler(makeContext(pool), {
        table: 'Customers',
        searchTerm: '50%_[a]!',
        columns: ['Notes'],
      });

      expect(requests[0].input).toHaveBeenCalledWith('pattern', '%50!%!_![a]!!%');
    });

    it('never places the search term in the SQL text', async () => {
      const { pool, requests } = makePool({ rows: [] });

      await AzureSql.actions.searchRows.handler(makeContext(pool), {
        table: 'Customers',
        searchTerm: "'; DROP TABLE Customers --",
        columns: ['Name'],
      });

      expect(requests[0].query.mock.calls[0][0]).not.toContain('DROP');
    });

    it('uses maxRows for both TOP and the streaming cap, and reports truncation', async () => {
      const { pool, requests } = makePool({ rows: rowsOf(4) });

      const result = (await AzureSql.actions.searchRows.handler(makeContext(pool), {
        table: 'Customers',
        searchTerm: 'a',
        columns: ['Name'],
        maxRows: 3,
        schema: 'sales',
      })) as { rowCount: number; truncated: boolean };

      expect(requests[0].query.mock.calls[0][0]).toContain('TOP (4) * FROM [sales].[Customers]');
      expect(result).toMatchObject({ rowCount: 3, truncated: true });
    });
  });

  describe('executeSql action', () => {
    it('runs any statement and returns rows affected', async () => {
      const { pool, requests } = makePool({ rowsAffected: [3] });

      const result = await AzureSql.actions.executeSql.handler(makeContext(pool), {
        sql: 'DELETE FROM Customers WHERE Id < 4',
      });

      expect(requests[0].query).toHaveBeenCalledWith('DELETE FROM Customers WHERE Id < 4');
      expect(result).toMatchObject({ rowsAffected: [3] });
    });

    it('never cancels the statement to cap its output, so writes are not rolled back', async () => {
      const { pool, requests } = makePool({ rows: rowsOf(1005), rowsAffected: [1005] });

      const result = (await AzureSql.actions.executeSql.handler(makeContext(pool), {
        sql: 'UPDATE Customers SET Seen = 1 OUTPUT inserted.Id',
      })) as { rowCount: number; truncated: boolean; rowsAffected: number[] };

      expect(requests[0].cancel).not.toHaveBeenCalled();
      expect(result).toMatchObject({ rowCount: 1000, truncated: true, rowsAffected: [1005] });
    });

    it('surfaces an error even after the output cap was passed', async () => {
      const { pool } = makePool({
        rows: rowsOf(1005),
        errors: [new Error('Violation of PRIMARY KEY')],
      });

      await expect(
        AzureSql.actions.executeSql.handler(makeContext(pool), { sql: 'INSERT INTO t VALUES (1)' })
      ).rejects.toThrow('Violation of PRIMARY KEY');
    });
  });

  describe('test handler', () => {
    it('runs a lightweight query', async () => {
      const { pool, requests } = makePool({ rows: [{ ok: 1 }] });

      const result = await AzureSql.test?.handler(makeContext(pool));

      expect(requests[0].query).toHaveBeenCalledWith('SELECT 1 AS ok');
      expect(result).toEqual({ message: 'Successfully connected to Azure SQL' });
    });

    it('fails when the connection fails', async () => {
      const ctx = makeContext(null);
      (ctx.getClient as jest.Mock).mockRejectedValue(new Error('Login failed for user'));

      await expect(AzureSql.test?.handler(ctx)).rejects.toThrow('Login failed for user');
    });
  });
});
