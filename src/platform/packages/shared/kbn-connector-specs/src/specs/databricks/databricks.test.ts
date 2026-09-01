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

// REST API mocks
const mockGet = jest.fn();
const mockPost = jest.fn();

// Apply Zod defaults the way the framework does before invoking a handler.
const parse = <K extends keyof typeof Databricks.actions>(
  action: K,
  raw: Record<string, unknown>
) => Databricks.actions[action].input.parse(raw);

const DATABRICKS_MCP_SERVER_URL =
  'https://adb-1234567890123456.7.azuredatabricks.net/api/2.0/mcp/sql';

describe('Databricks', () => {
  const mockContext = {
    client: { get: mockGet, post: mockPost },
    log: {},
    config: { serverUrl: DATABRICKS_MCP_SERVER_URL },
  } as unknown as ActionContext;

  const WORKSPACE_ORIGIN = 'https://adb-1234567890123456.7.azuredatabricks.net';

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
    mockGet.mockResolvedValue({ data: {} });
    mockPost.mockResolvedValue({ data: {} });
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

    it('supports agentBuilder', () => {
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
          scope: 'all-apis offline_access',
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
    it('is not exposed as a tool (workflow-only)', () => {
      expect(Databricks.actions.listTools.isTool).toBe(false);
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
    it('is not exposed as a tool (workflow-only)', () => {
      expect(Databricks.actions.callTool.isTool).toBe(false);
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
      const result = await Databricks.test.handler(mockContext);
      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual({
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

  describe('listRuns action', () => {
    it('is exposed as a tool', () => {
      expect(Databricks.actions.listRuns.isTool).toBe(true);
    });

    it('calls GET /api/2.1/jobs/runs/list with no params when none provided', async () => {
      const input = parse('listRuns', {});
      await Databricks.actions.listRuns.handler(mockContext, input);
      expect(mockGet).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.1/jobs/runs/list`, {
        params: {},
      });
    });

    it('passes jobId, activeOnly, and limit as snake_case params', async () => {
      const input = parse('listRuns', { jobId: 42, activeOnly: true, limit: 10 });
      await Databricks.actions.listRuns.handler(mockContext, input);
      expect(mockGet).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.1/jobs/runs/list`, {
        params: { job_id: 42, active_only: true, limit: 10 },
      });
    });
  });

  describe('getRun action', () => {
    it('is exposed as a tool', () => {
      expect(Databricks.actions.getRun.isTool).toBe(true);
    });

    it('calls GET /api/2.1/jobs/runs/get with run_id', async () => {
      const input = parse('getRun', { runId: 455644833 });
      await Databricks.actions.getRun.handler(mockContext, input);
      expect(mockGet).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.1/jobs/runs/get`, {
        params: { run_id: 455644833 },
      });
    });
  });

  describe('getRunOutput action', () => {
    it('is exposed as a tool', () => {
      expect(Databricks.actions.getRunOutput.isTool).toBe(true);
    });

    it('calls GET /api/2.1/jobs/runs/get-output with run_id', async () => {
      const input = parse('getRunOutput', { runId: 455644833 });
      await Databricks.actions.getRunOutput.handler(mockContext, input);
      expect(mockGet).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.1/jobs/runs/get-output`, {
        params: { run_id: 455644833 },
      });
    });
  });

  describe('runJobNow action', () => {
    it('is not exposed as a tool', () => {
      expect(Databricks.actions.runJobNow.isTool).toBe(false);
    });

    it('calls POST /api/2.1/jobs/runs/now with job_id', async () => {
      const input = parse('runJobNow', { jobId: 11223344 });
      await Databricks.actions.runJobNow.handler(mockContext, input);
      expect(mockPost).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.1/jobs/run-now`, {
        job_id: 11223344,
      });
    });

    it('includes job_parameters when provided', async () => {
      const input = parse('runJobNow', { jobId: 11223344, jobParameters: { env: 'prod' } });
      await Databricks.actions.runJobNow.handler(mockContext, input);
      expect(mockPost).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.1/jobs/run-now`, {
        job_id: 11223344,
        job_parameters: { env: 'prod' },
      });
    });
  });

  describe('cancelRun action', () => {
    it('is not exposed as a tool', () => {
      expect(Databricks.actions.cancelRun.isTool).toBe(false);
    });

    it('calls POST /api/2.1/jobs/runs/cancel with run_id', async () => {
      const input = parse('cancelRun', { runId: 455644833 });
      await Databricks.actions.cancelRun.handler(mockContext, input);
      expect(mockPost).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.1/jobs/runs/cancel`, {
        run_id: 455644833,
      });
    });
  });

  describe('repairRun action', () => {
    it('is not exposed as a tool', () => {
      expect(Databricks.actions.repairRun.isTool).toBe(false);
    });

    it('rejects when neither selector is provided', () => {
      expect(() => parse('repairRun', { runId: 455644833 })).toThrow('Specify exactly one');
    });

    it('sends rerun_all_failed_tasks=true when rerunAllFailedTasks: true', async () => {
      const input = parse('repairRun', { runId: 455644833, rerunAllFailedTasks: true });
      await Databricks.actions.repairRun.handler(mockContext, input);
      expect(mockPost).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.1/jobs/runs/repair`, {
        run_id: 455644833,
        rerun_all_failed_tasks: true,
      });
    });

    it('includes rerunTasks and latestRepairId when provided', async () => {
      const input = parse('repairRun', {
        runId: 455644833,
        rerunTasks: ['task_a', 'task_b'],
        latestRepairId: 789,
      });
      await Databricks.actions.repairRun.handler(mockContext, input);
      expect(mockPost).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.1/jobs/runs/repair`, {
        run_id: 455644833,
        rerun_tasks: ['task_a', 'task_b'],
        latest_repair_id: 789,
      });
    });

    it('rejects when both rerunTasks and rerunAllFailedTasks are provided', () => {
      expect(() =>
        parse('repairRun', {
          runId: 455644833,
          rerunTasks: ['task_a'],
          rerunAllFailedTasks: true,
        })
      ).toThrow('Specify exactly one');
    });

    it('rejects when rerunTasks is an empty array', () => {
      expect(() => parse('repairRun', { runId: 455644833, rerunTasks: [] })).toThrow();
    });

    it('rejects when rerunAllFailedTasks is false and no rerunTasks provided', () => {
      expect(() => parse('repairRun', { runId: 455644833, rerunAllFailedTasks: false })).toThrow(
        'Specify exactly one'
      );
    });
  });

  describe('listClusters action', () => {
    it('is exposed as a tool', () => {
      expect(Databricks.actions.listClusters.isTool).toBe(true);
    });

    it('calls GET /api/2.0/clusters/list', async () => {
      const input = parse('listClusters', {});
      await Databricks.actions.listClusters.handler(mockContext, input);
      expect(mockGet).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.0/clusters/list`);
    });
  });

  describe('startCluster action', () => {
    it('is not exposed as a tool', () => {
      expect(Databricks.actions.startCluster.isTool).toBe(false);
    });

    it('calls POST /api/2.0/clusters/start with cluster_id', async () => {
      const input = parse('startCluster', { clusterId: '0923-164208-meows279' });
      await Databricks.actions.startCluster.handler(mockContext, input);
      expect(mockPost).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.0/clusters/start`, {
        cluster_id: '0923-164208-meows279',
      });
    });
  });

  describe('restartCluster action', () => {
    it('is not exposed as a tool', () => {
      expect(Databricks.actions.restartCluster.isTool).toBe(false);
    });

    it('calls POST /api/2.0/clusters/restart with cluster_id', async () => {
      const input = parse('restartCluster', { clusterId: '0923-164208-meows279' });
      await Databricks.actions.restartCluster.handler(mockContext, input);
      expect(mockPost).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.0/clusters/restart`, {
        cluster_id: '0923-164208-meows279',
      });
    });
  });

  describe('listWarehouses action', () => {
    it('is exposed as a tool', () => {
      expect(Databricks.actions.listWarehouses.isTool).toBe(true);
    });

    it('calls GET /api/2.0/sql/warehouses', async () => {
      const input = parse('listWarehouses', {});
      await Databricks.actions.listWarehouses.handler(mockContext, input);
      expect(mockGet).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.0/sql/warehouses`);
    });
  });

  describe('startWarehouse action', () => {
    it('is not exposed as a tool', () => {
      expect(Databricks.actions.startWarehouse.isTool).toBe(false);
    });

    it('calls POST /api/2.0/sql/warehouses/{id}/start', async () => {
      const input = parse('startWarehouse', { warehouseId: 'abc123' });
      await Databricks.actions.startWarehouse.handler(mockContext, input);
      expect(mockPost).toHaveBeenCalledWith(
        `${WORKSPACE_ORIGIN}/api/2.0/sql/warehouses/abc123/start`
      );
    });
  });

  describe('stopWarehouse action', () => {
    it('is not exposed as a tool', () => {
      expect(Databricks.actions.stopWarehouse.isTool).toBe(false);
    });

    it('calls POST /api/2.0/sql/warehouses/{id}/stop', async () => {
      const input = parse('stopWarehouse', { warehouseId: 'abc123' });
      await Databricks.actions.stopWarehouse.handler(mockContext, input);
      expect(mockPost).toHaveBeenCalledWith(
        `${WORKSPACE_ORIGIN}/api/2.0/sql/warehouses/abc123/stop`
      );
    });
  });

  describe('listAlerts action', () => {
    it('is exposed as a tool', () => {
      expect(Databricks.actions.listAlerts.isTool).toBe(true);
    });

    it('calls GET /api/2.0/sql/alerts', async () => {
      const input = parse('listAlerts', {});
      await Databricks.actions.listAlerts.handler(mockContext, input);
      expect(mockGet).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.0/sql/alerts`);
    });
  });

  describe('getAlert action', () => {
    it('is exposed as a tool', () => {
      expect(Databricks.actions.getAlert.isTool).toBe(true);
    });

    it('calls GET /api/2.0/sql/alerts/{id}', async () => {
      const input = parse('getAlert', { alertId: 'abc123def456' });
      await Databricks.actions.getAlert.handler(mockContext, input);
      expect(mockGet).toHaveBeenCalledWith(`${WORKSPACE_ORIGIN}/api/2.0/sql/alerts/abc123def456`);
    });
  });
});
