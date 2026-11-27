/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { AwsRds } from './aws_rds';

const CLUSTER_ARN = 'arn:aws:rds:us-east-1:123456789012:cluster:my-cluster';
const SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789012:secret:my-db-secret-AbCdEf';

describe('AwsRds', () => {
  const mockClient = { post: jest.fn() };

  const buildContext = (config: Record<string, unknown> = {}): ActionContext =>
    ({
      client: mockClient,
      config: {
        region: 'us-east-1',
        clusterArn: CLUSTER_ARN,
        secretArn: SECRET_ARN,
        database: 'shop',
        engine: 'mysql',
        ...config,
      },
      log: {},
    }) as unknown as ActionContext;

  const respondWithRows = (rows: unknown[], extra: Record<string, unknown> = {}) =>
    mockClient.post.mockResolvedValueOnce({
      data: { formattedRecords: JSON.stringify(rows), ...extra },
    });

  const sentBody = (call = 0) => JSON.parse(mockClient.post.mock.calls[call][1]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has the expected id, auth type, and ships agentBuilder only', () => {
      expect(AwsRds.metadata.id).toBe('.aws_rds');
      expect(AwsRds.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
      expect(AwsRds.auth?.types).toEqual(['aws_credentials']);
    });

    it('classifies every tool action with a scope', () => {
      const scopes = Object.fromEntries(
        Object.entries(AwsRds.actions).map(([name, action]) => [name, action.scope])
      );
      expect(scopes).toEqual({
        query: 'read',
        listDatabases: 'read',
        listTables: 'read',
        describeTable: 'read',
        getSchema: 'read',
        executeSql: 'destroy',
      });
      expect(AwsRds.actions.executeSql.isTool).toBe(true);
    });
  });

  describe('config schema', () => {
    const valid = {
      region: 'us-east-1',
      clusterArn: CLUSTER_ARN,
      secretArn: SECRET_ARN,
      engine: 'postgresql',
    };

    it('accepts a valid config', () => {
      expect(AwsRds.schema?.safeParse(valid).success).toBe(true);
    });

    it.each([
      'evil.example.com/',
      'us-east-1.evil.com#',
      'US-EAST-1',
      'us-east-1\n',
      '',
      'localhost',
    ])('rejects region %j, which would be interpolated into the request host', (region) => {
      expect(AwsRds.schema?.safeParse({ ...valid, region }).success).toBe(false);
    });

    it.each([
      ['clusterArn', 'arn:aws:rds:us-east-1:123456789012:db:my-instance'],
      ['clusterArn', 'not-an-arn'],
      ['secretArn', 'arn:aws:s3:::bucket'],
    ])('rejects a malformed %s: %s', (field, value) => {
      expect(AwsRds.schema?.safeParse({ ...valid, [field]: value }).success).toBe(false);
    });

    it('accepts an RDS-managed master secret ARN, which is longer than 100 characters', () => {
      const secretArn =
        'arn:aws:secretsmanager:us-east-2:123456789012:secret:rds!cluster-00000000-0000-0000-0000-000000000000-AbCdEf';
      expect(secretArn.length).toBeGreaterThan(100);
      expect(AwsRds.schema?.safeParse({ ...valid, secretArn }).success).toBe(true);
    });

    it('rejects an unsupported engine', () => {
      expect(AwsRds.schema?.safeParse({ ...valid, engine: 'oracle' }).success).toBe(false);
    });
  });

  describe('query', () => {
    it('posts the exact Data API request and returns parsed rows', async () => {
      respondWithRows([{ id: 1, name: 'Ada' }]);

      const result = await AwsRds.actions.query.handler(buildContext(), {
        sql: 'SELECT id, name FROM customers LIMIT 10',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://rds-data.us-east-1.amazonaws.com/Execute',
        expect.any(String),
        { headers: { 'Content-Type': 'application/json' } }
      );
      expect(sentBody()).toEqual({
        resourceArn: CLUSTER_ARN,
        secretArn: SECRET_ARN,
        sql: 'SELECT id, name FROM customers LIMIT 10',
        formatRecordsAs: 'JSON',
        database: 'shop',
      });
      expect(result).toEqual({ rows: [{ id: 1, name: 'Ada' }], truncated: false });
    });

    it('uses the region from config in the request host', async () => {
      respondWithRows([]);
      await AwsRds.actions.query.handler(buildContext({ region: 'eu-west-2' }), {
        sql: 'SELECT 1',
      });
      expect(mockClient.post.mock.calls[0][0]).toBe(
        'https://rds-data.eu-west-2.amazonaws.com/Execute'
      );
    });

    it('prefers the database from input over the configured default', async () => {
      respondWithRows([]);
      await AwsRds.actions.query.handler(buildContext(), { sql: 'SELECT 1', database: 'other' });
      expect(sentBody().database).toBe('other');
    });

    it('omits database when none is configured or provided', async () => {
      respondWithRows([]);
      await AwsRds.actions.query.handler(buildContext({ database: undefined }), {
        sql: 'SELECT 1',
      });
      expect(sentBody()).not.toHaveProperty('database');
    });

    it('truncates to maxRows and reports it', async () => {
      respondWithRows([{ n: 1 }, { n: 2 }, { n: 3 }]);
      const result = await AwsRds.actions.query.handler(buildContext(), {
        sql: 'SELECT n FROM t',
        maxRows: 2,
      });
      expect(result).toEqual({ rows: [{ n: 1 }, { n: 2 }], truncated: true });
    });

    it('defaults maxRows to 100', async () => {
      respondWithRows(Array.from({ length: 150 }, (_, n) => ({ n })));
      const result = (await AwsRds.actions.query.handler(buildContext(), {
        sql: 'SELECT n FROM t',
      })) as { rows: unknown[]; truncated: boolean };
      expect(result.rows).toHaveLength(100);
      expect(result.truncated).toBe(true);
    });

    it('returns no rows when the response has no formattedRecords', async () => {
      mockClient.post.mockResolvedValueOnce({ data: {} });
      const result = await AwsRds.actions.query.handler(buildContext(), { sql: 'SELECT 1' });
      expect(result).toEqual({ rows: [], truncated: false });
    });

    it('throws when formattedRecords is not valid JSON', async () => {
      mockClient.post.mockResolvedValueOnce({ data: { formattedRecords: '{oops' } });
      await expect(
        AwsRds.actions.query.handler(buildContext(), { sql: 'SELECT 1' })
      ).rejects.toThrow('could not be parsed as JSON');
    });

    it.each([
      ['an INSERT', 'INSERT INTO t VALUES (1)'],
      ['an UPDATE', 'UPDATE t SET a = 1'],
      ['a DELETE', 'DELETE FROM t'],
      ['DDL', 'DROP TABLE t'],
      ['SHOW', 'SHOW TABLES'],
      ['multiple statements', 'SELECT 1; DROP TABLE t'],
      ['SELECT INTO (creates a table in PostgreSQL)', 'SELECT * INTO copy FROM t'],
      ['a data-modifying CTE', 'WITH x AS (DELETE FROM t RETURNING *) SELECT * FROM x'],
      ['a MySQL executable comment', 'SELECT 1 /*! ; DROP TABLE t */'],
    ])('rejects %s without calling the API', async (_label, sql) => {
      await expect(AwsRds.actions.query.handler(buildContext(), { sql })).rejects.toThrow();
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it.each([
      'SELECT 1',
      '  select * from t',
      '-- note\nSELECT 1',
      'WITH c AS (SELECT 1) SELECT * FROM c',
    ])('accepts read-only SQL %j', async (sql) => {
      respondWithRows([]);
      await expect(AwsRds.actions.query.handler(buildContext(), { sql })).resolves.toBeDefined();
    });

    it('surfaces the AWS error type and message', async () => {
      mockClient.post.mockRejectedValueOnce({
        message: 'Request failed with status code 400',
        response: {
          status: 400,
          headers: { 'x-amzn-errortype': 'BadRequestException:http://internal.amazon.com/' },
          data: { message: 'Syntax error near FROM' },
        },
      });
      await expect(
        AwsRds.actions.query.handler(buildContext(), { sql: 'SELECT FROM' })
      ).rejects.toThrow('AWS RDS Data API error [BadRequestException]: Syntax error near FROM');
    });

    it('reports transport failures that have no response', async () => {
      mockClient.post.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'));
      await expect(
        AwsRds.actions.query.handler(buildContext(), { sql: 'SELECT 1' })
      ).rejects.toThrow('AWS RDS Data API request failed: getaddrinfo ENOTFOUND');
    });
  });

  describe('input schema bounds', () => {
    it('rejects an over-long sql string and an out-of-range maxRows', () => {
      const schema = AwsRds.actions.query.input;
      expect(schema.safeParse({ sql: 'x'.repeat(10001) }).success).toBe(false);
      expect(schema.safeParse({ sql: 'SELECT 1', maxRows: 1001 }).success).toBe(false);
      expect(schema.safeParse({ sql: 'SELECT 1', maxRows: 0 }).success).toBe(false);
      expect(schema.safeParse({ sql: 'SELECT 1', maxRows: 1000 }).success).toBe(true);
    });
  });

  describe('listDatabases', () => {
    it('queries information_schema for MySQL', async () => {
      respondWithRows([{ database_name: 'shop' }]);
      const result = await AwsRds.actions.listDatabases.handler(buildContext(), {});
      expect(sentBody().sql).toContain('information_schema.schemata');
      expect(result).toEqual({ rows: [{ database_name: 'shop' }] });
    });

    it('queries pg_database for PostgreSQL', async () => {
      respondWithRows([{ database_name: 'shop' }]);
      await AwsRds.actions.listDatabases.handler(buildContext({ engine: 'postgresql' }), {});
      expect(sentBody().sql).toContain('pg_database');
    });
  });

  describe('listTables', () => {
    it('binds the configured database as the MySQL schema through a named parameter', async () => {
      respondWithRows([{ table_name: 'orders', table_type: 'BASE TABLE' }]);
      const result = await AwsRds.actions.listTables.handler(buildContext(), {});
      expect(sentBody().sql).toContain('table_schema = :schema_name');
      expect(sentBody().parameters).toEqual([
        { name: 'schema_name', value: { stringValue: 'shop' } },
      ]);
      expect(result).toEqual({ rows: [{ table_name: 'orders', table_type: 'BASE TABLE' }] });
    });

    it('uses the input database for MySQL and ignores schema', async () => {
      respondWithRows([]);
      await AwsRds.actions.listTables.handler(buildContext(), { database: 'other', schema: 'x' });
      expect(sentBody().database).toBe('other');
      expect(sentBody().parameters[0].value.stringValue).toBe('other');
    });

    it('defaults to the public schema for PostgreSQL', async () => {
      respondWithRows([]);
      await AwsRds.actions.listTables.handler(buildContext({ engine: 'postgresql' }), {});
      expect(sentBody().parameters[0].value.stringValue).toBe('public');
    });

    it('uses the requested schema for PostgreSQL', async () => {
      respondWithRows([]);
      await AwsRds.actions.listTables.handler(buildContext({ engine: 'postgresql' }), {
        schema: 'sales',
      });
      expect(sentBody().parameters[0].value.stringValue).toBe('sales');
    });

    it('passes a hostile table-schema value as a bound parameter, never in the SQL text', async () => {
      respondWithRows([]);
      const hostile = "x' OR '1'='1";
      await AwsRds.actions.listTables.handler(buildContext({ engine: 'postgresql' }), {
        schema: hostile,
      });
      expect(sentBody().sql).not.toContain(hostile);
      expect(sentBody().parameters[0].value.stringValue).toBe(hostile);
    });

    it('requires a database for MySQL when none is configured', async () => {
      await expect(
        AwsRds.actions.listTables.handler(buildContext({ database: undefined }), {})
      ).rejects.toThrow('No database specified');
      expect(mockClient.post).not.toHaveBeenCalled();
    });
  });

  describe('describeTable', () => {
    it('returns columns and constraints using bound parameters', async () => {
      respondWithRows([{ column_name: 'id', data_type: 'int', is_nullable: 'NO' }]);
      respondWithRows([
        { constraint_name: 'PRIMARY', constraint_type: 'PRIMARY KEY', column_name: 'id' },
      ]);

      const result = await AwsRds.actions.describeTable.handler(buildContext(), {
        table: 'orders',
      });

      expect(mockClient.post).toHaveBeenCalledTimes(2);
      expect(sentBody(0).parameters).toEqual([
        { name: 'schema_name', value: { stringValue: 'shop' } },
        { name: 'table_name', value: { stringValue: 'orders' } },
      ]);
      expect(sentBody(1).sql).toContain('table_constraints');
      expect(result).toEqual({
        columns: [{ column_name: 'id', data_type: 'int', is_nullable: 'NO' }],
        constraints: [
          { constraint_name: 'PRIMARY', constraint_type: 'PRIMARY KEY', column_name: 'id' },
        ],
      });
    });

    it('reads constraints from pg_catalog on PostgreSQL so SELECT-only users still see them', async () => {
      respondWithRows([{ column_name: 'id', data_type: 'integer', is_nullable: 'NO' }]);
      respondWithRows([
        { constraint_name: 'orders_pkey', constraint_type: 'PRIMARY KEY', column_name: 'id' },
      ]);

      const result = await AwsRds.actions.describeTable.handler(
        buildContext({ engine: 'postgresql' }),
        { table: 'orders' }
      );

      expect(sentBody(1).sql).toContain('pg_constraint');
      expect(sentBody(1).sql).not.toContain('table_constraints');
      expect(sentBody(1).parameters).toEqual([
        { name: 'schema_name', value: { stringValue: 'public' } },
        { name: 'table_name', value: { stringValue: 'orders' } },
      ]);
      expect(result).toEqual({
        columns: [{ column_name: 'id', data_type: 'integer', is_nullable: 'NO' }],
        constraints: [
          { constraint_name: 'orders_pkey', constraint_type: 'PRIMARY KEY', column_name: 'id' },
        ],
      });
    });

    it('fails with a helpful message when the table has no columns', async () => {
      respondWithRows([]);
      await expect(
        AwsRds.actions.describeTable.handler(buildContext(), { table: 'missing' })
      ).rejects.toThrow('Table "missing" was not found in "shop"');
      expect(mockClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSchema', () => {
    it('groups columns by table', async () => {
      respondWithRows([
        { table_name: 'orders', column_name: 'id', data_type: 'int', is_nullable: 'NO' },
        { table_name: 'orders', column_name: 'total', data_type: 'decimal', is_nullable: 'YES' },
        { table_name: 'users', column_name: 'id', data_type: 'int', is_nullable: 'NO' },
      ]);

      const result = await AwsRds.actions.getSchema.handler(buildContext(), {});

      expect(result).toEqual({
        tables: {
          orders: [
            { column_name: 'id', data_type: 'int', is_nullable: 'NO' },
            { column_name: 'total', data_type: 'decimal', is_nullable: 'YES' },
          ],
          users: [{ column_name: 'id', data_type: 'int', is_nullable: 'NO' }],
        },
        truncated: false,
      });
    });

    it.each(['constructor', 'toString', '__proto__'])(
      'groups columns for a table named %s without throwing',
      async (tableName) => {
        respondWithRows([
          { table_name: tableName, column_name: 'id', data_type: 'int', is_nullable: 'NO' },
          { table_name: tableName, column_name: 'name', data_type: 'text', is_nullable: 'YES' },
        ]);

        const { tables } = (await AwsRds.actions.getSchema.handler(buildContext(), {})) as {
          tables: Record<string, unknown>;
        };

        expect(Object.keys(tables)).toEqual([tableName]);
        expect(Object.getOwnPropertyDescriptor(tables, tableName)?.value).toEqual([
          { column_name: 'id', data_type: 'int', is_nullable: 'NO' },
          { column_name: 'name', data_type: 'text', is_nullable: 'YES' },
        ]);
      }
    );

    it('reports truncation when the column cap is exceeded', async () => {
      respondWithRows(
        Array.from({ length: 2001 }, (_, n) => ({
          table_name: `t${n}`,
          column_name: 'c',
          data_type: 'int',
          is_nullable: 'NO',
        }))
      );
      const result = (await AwsRds.actions.getSchema.handler(buildContext(), {})) as {
        tables: Record<string, unknown>;
        truncated: boolean;
      };
      expect(result.truncated).toBe(true);
      expect(Object.keys(result.tables)).toHaveLength(2000);
    });
  });

  describe('executeSql', () => {
    it('runs write statements unrestricted and returns the update count', async () => {
      mockClient.post.mockResolvedValueOnce({ data: { numberOfRecordsUpdated: 3 } });

      const result = await AwsRds.actions.executeSql.handler(buildContext(), {
        sql: "UPDATE orders SET status = 'shipped'",
      });

      expect(sentBody().sql).toBe("UPDATE orders SET status = 'shipped'");
      expect(result).toEqual({ rows: [], numberOfRecordsUpdated: 3 });
    });

    it('asks the Data API for column metadata so non-SELECT rows can be named', async () => {
      mockClient.post.mockResolvedValueOnce({ data: { numberOfRecordsUpdated: 1 } });
      await AwsRds.actions.executeSql.handler(buildContext(), { sql: 'DELETE FROM orders' });
      expect(sentBody().includeResultMetadata).toBe(true);
    });

    it('returns rows from `records` when the JSON format does not apply, such as RETURNING', async () => {
      mockClient.post.mockResolvedValueOnce({
        data: {
          numberOfRecordsUpdated: 1,
          columnMetadata: [
            { label: 'id', name: 'id' },
            { label: 'note', name: 'note' },
          ],
          records: [[{ longValue: 42 }, { stringValue: 'new' }]],
        },
      });

      const result = await AwsRds.actions.executeSql.handler(
        buildContext({ engine: 'postgresql' }),
        {
          sql: "INSERT INTO orders (note) VALUES ('new') RETURNING id, note",
        }
      );

      expect(result).toEqual({
        rows: [{ id: 42, note: 'new' }],
        numberOfRecordsUpdated: 1,
      });
    });

    it('unwraps every typed field value, including NULL, zero and false', async () => {
      mockClient.post.mockResolvedValueOnce({
        data: {
          columnMetadata: [{ label: 'a' }, { label: 'b' }, { label: 'c' }, { label: 'd' }],
          records: [
            [{ isNull: true }, { longValue: 0 }, { booleanValue: false }, { doubleValue: 1.5 }],
          ],
        },
      });

      const result = await AwsRds.actions.executeSql.handler(buildContext(), {
        sql: 'INSERT ... RETURNING a, b, c, d',
      });

      expect(result).toEqual({
        rows: [{ a: null, b: 0, c: false, d: 1.5 }],
        numberOfRecordsUpdated: undefined,
      });
    });

    it('names columns by position when the response has no metadata', async () => {
      mockClient.post.mockResolvedValueOnce({
        data: { records: [[{ stringValue: 'x' }, { longValue: 7 }]] },
      });

      const result = await AwsRds.actions.executeSql.handler(buildContext(), { sql: 'SELECT 1' });

      expect(result).toEqual({
        rows: [{ column_1: 'x', column_2: 7 }],
        numberOfRecordsUpdated: undefined,
      });
    });

    it('returns generatedFields, such as a MySQL auto-increment ID', async () => {
      mockClient.post.mockResolvedValueOnce({
        data: { numberOfRecordsUpdated: 1, generatedFields: [{ longValue: 17 }] },
      });

      const result = await AwsRds.actions.executeSql.handler(buildContext(), {
        sql: "INSERT INTO customers (name) VALUES ('Ada')",
      });

      expect(result).toEqual({ rows: [], numberOfRecordsUpdated: 1, generatedFields: [17] });
    });

    it('does not request column metadata from the read actions', async () => {
      respondWithRows([]);
      respondWithRows([]);
      await AwsRds.actions.query.handler(buildContext(), { sql: 'SELECT 1' });
      await AwsRds.actions.listDatabases.handler(buildContext(), {});
      expect(sentBody(0)).not.toHaveProperty('includeResultMetadata');
      expect(sentBody(1)).not.toHaveProperty('includeResultMetadata');
    });
  });

  describe('test handler', () => {
    it('runs SELECT 1 and reports success', async () => {
      respondWithRows([{ '1': 1 }]);
      await expect(AwsRds.test?.handler(buildContext())).resolves.toEqual({
        message: 'Successfully connected to Aurora through the RDS Data API',
      });
      expect(sentBody().sql).toBe('SELECT 1');
    });

    it('fails when the credential or access check fails', async () => {
      mockClient.post.mockRejectedValueOnce({
        message: 'Request failed with status code 403',
        response: {
          status: 403,
          headers: { 'x-amzn-errortype': 'AccessDeniedException' },
          data: { message: 'not authorized to perform rds-data:ExecuteStatement' },
        },
      });
      await expect(AwsRds.test?.handler(buildContext())).rejects.toThrow('AccessDeniedException');
    });
  });
});
