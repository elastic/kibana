/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { Databricks } from './databricks';

// Mock withMcpClient so handlers don't need a real MCP transport.
// callToolJson/callToolContent also route through withMcpClient internally.
const mockCallTool = jest.fn();
const mockListTools = jest.fn();

jest.mock('../../lib/mcp/with_mcp_client', () => ({
  withMcpClient: jest.fn(async (_ctx: unknown, fn: (mcp: unknown) => Promise<unknown>) => {
    return fn({ callTool: mockCallTool, listTools: mockListTools });
  }),
}));

// Apply Zod defaults the way the framework does before invoking a handler.
const parse = <K extends keyof typeof Databricks.actions>(
  action: K,
  raw: Record<string, unknown>
) => Databricks.actions[action].input.parse(raw);

const DATABRICKS_MCP_SERVER_URL =
  'https://adb-1234567890123456.7.azuredatabricks.net/api/2.0/mcp/sql';

describe('Databricks', () => {
  const mockContext = {
    client: {},
    log: {},
    config: { serverUrl: DATABRICKS_MCP_SERVER_URL },
  } as unknown as ActionContext;

  const mockResultSet = {
    statement_id: 'stmt-01ef1234',
    status: { state: 'SUCCEEDED' },
    result: { data_typed_array: [{ values: [{ str: 'hello' }] }] },
  };
  const mockResultContent = [{ type: 'text', text: JSON.stringify(mockResultSet) }];

  const mockStatementHandle = {
    statement_id: 'stmt-01ef1234',
    status: { state: 'RUNNING' },
  };
  const mockHandleContent = [{ type: 'text', text: JSON.stringify(mockStatementHandle) }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallTool.mockResolvedValue({ content: mockResultContent });
    mockListTools.mockResolvedValue({
      tools: [
        { name: 'execute_sql' },
        { name: 'execute_sql_read_only' },
        { name: 'poll_sql_result' },
      ],
    });
  });

  it('should be defined', () => {
    expect(Databricks).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.databricks');
    expect(spec).toBe(Databricks);
    expect(spec?.actions.runQuery).toBeDefined();
    expect(spec?.actions.runQuery.isTool).toBe(true);
    expect(spec?.actions.executeStatement).toBeDefined();
    expect(spec?.actions.executeStatement.isTool).toBe(false);
  });

  describe('metadata', () => {
    it('has correct id and minimum license', () => {
      expect(Databricks.metadata.id).toBe('.databricks');
      expect(Databricks.metadata.minimumLicense).toBe('enterprise');
    });

    it('supports workflows and agentBuilder', () => {
      expect(Databricks.metadata.supportedFeatureIds).toContain('workflows');
      expect(Databricks.metadata.supportedFeatureIds).toContain('agentBuilder');
    });

    it('is marked as technical preview', () => {
      expect(Databricks.metadata.isTechnicalPreview).toBe(true);
    });
  });

  describe('auth', () => {
    it('includes oauth_authorization_code with workspace-specific URL placeholders', () => {
      const oauthType = Databricks.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_authorization_code'
      );
      expect(oauthType).toMatchObject({
        type: 'oauth_authorization_code',
        defaults: {
          scope: 'sql offline_access',
        },
      });
    });

    it('hides the OAuth scope field', () => {
      const oauthType = Databricks.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_authorization_code'
      ) as { overrides?: { meta?: Record<string, unknown> } } | undefined;
      expect(oauthType?.overrides?.meta).toMatchObject({
        scope: { hidden: true },
      });
    });

    it('includes bearer token auth type', () => {
      const bearerType = Databricks.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'bearer'
      );
      expect(bearerType).toBeDefined();
    });
  });

  describe('schema', () => {
    it('requires a serverUrl field', () => {
      if (!Databricks.schema) throw new Error('schema not defined');
      // serverUrl has no default, so passing empty object should fail
      expect(() => Databricks.schema?.parse({})).toThrow();
    });

    it('accepts a valid serverUrl', () => {
      if (!Databricks.schema) throw new Error('schema not defined');
      const parsed = Databricks.schema.parse({ serverUrl: DATABRICKS_MCP_SERVER_URL });
      expect((parsed as { serverUrl?: string }).serverUrl).toBe(DATABRICKS_MCP_SERVER_URL);
    });
  });

  describe('validateUrls', () => {
    it('validates the serverUrl field', () => {
      expect(Databricks.validateUrls?.fields).toContain('serverUrl');
    });
  });

  describe('runQuery action', () => {
    it('is exposed as a tool', () => {
      expect(Databricks.actions.runQuery.isTool).toBe(true);
    });

    it('calls execute_sql_read_only with the statement as query', async () => {
      const input = parse('runQuery', { statement: 'SELECT 1' });
      await Databricks.actions.runQuery.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'execute_sql_read_only',
        arguments: { query: 'SELECT 1' },
      });
    });
  });

  describe('executeStatement action', () => {
    it('is not exposed as a tool (workflow-only)', () => {
      expect(Databricks.actions.executeStatement.isTool).toBe(false);
    });

    it('calls execute_sql with the statement as query', async () => {
      const input = parse('executeStatement', { statement: 'INSERT INTO t VALUES (1)' });
      await Databricks.actions.executeStatement.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'execute_sql',
        arguments: { query: 'INSERT INTO t VALUES (1)' },
      });
    });

    it('allows DML without throwing', async () => {
      const input = parse('executeStatement', { statement: 'DELETE FROM t WHERE id = 1' });
      await expect(
        Databricks.actions.executeStatement.handler(mockContext, input)
      ).resolves.toBeDefined();
    });

    it('allows DDL without throwing', async () => {
      const input = parse('executeStatement', { statement: 'DROP TABLE IF EXISTS t' });
      await expect(
        Databricks.actions.executeStatement.handler(mockContext, input)
      ).resolves.toBeDefined();
    });
  });

  describe('pollResponse action', () => {
    it('is exposed as a tool', () => {
      expect(Databricks.actions.pollResponse.isTool).toBe(true);
    });

    it('calls poll_sql_result with the statement_id', async () => {
      mockCallTool.mockResolvedValue({ content: mockHandleContent });
      const input = parse('pollResponse', { statementId: 'stmt-01ef1234' });
      await Databricks.actions.pollResponse.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'poll_sql_result',
        arguments: { statement_id: 'stmt-01ef1234' },
      });
    });
  });

  describe('listTools action', () => {
    it('is exposed as a tool', () => {
      expect(Databricks.actions.listTools.isTool).toBe(true);
    });

    it('returns the list of available tools', async () => {
      const result = await Databricks.actions.listTools.handler(mockContext, {});
      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual([
        { name: 'execute_sql' },
        { name: 'execute_sql_read_only' },
        { name: 'poll_sql_result' },
      ]);
    });
  });

  describe('callTool action', () => {
    it('is exposed as a tool', () => {
      expect(Databricks.actions.callTool.isTool).toBe(true);
    });

    it('calls the named tool with provided arguments', async () => {
      const input = parse('callTool', {
        name: 'execute_sql',
        arguments: { query: 'SELECT 1' },
      });
      await Databricks.actions.callTool.handler(mockContext, input);
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'execute_sql',
        arguments: { query: 'SELECT 1' },
      });
    });

    it('calls the named tool with empty arguments when omitted', async () => {
      const input = parse('callTool', { name: 'some_tool' });
      await Databricks.actions.callTool.handler(mockContext, input);
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'some_tool',
        arguments: {},
      });
    });
  });

  describe('test handler', () => {
    it('returns ok with tool count on successful connection', async () => {
      if (!Databricks.test) throw new Error('test handler not defined');
      const result = await Databricks.test.handler(mockContext);
      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual({
        ok: true,
        message: 'Connected to Databricks MCP server. 3 tools available.',
      });
    });

    it('propagates errors thrown by withMcpClient', async () => {
      const { withMcpClient } = jest.requireMock('../../lib/mcp/with_mcp_client');
      withMcpClient.mockRejectedValueOnce(new Error('connection refused'));
      if (!Databricks.test) throw new Error('test handler not defined');
      await expect(Databricks.test.handler(mockContext)).rejects.toThrow('connection refused');
    });
  });

  describe('skill property', () => {
    it('is defined and contains multi-step guidance', () => {
      expect(Databricks.skill).toBeDefined();
      expect(typeof Databricks.skill).toBe('string');
      expect(Databricks.skill).toContain('runQuery');
      expect(Databricks.skill).toContain('executeStatement');
      expect(Databricks.skill).toContain('pollResponse');
    });
  });
});
