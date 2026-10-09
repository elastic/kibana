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
import { AzureMonitor } from './azure_monitor';

const ARM_BASE = 'https://management.azure.com';
const SUB_ID = '11111111-1111-1111-1111-111111111111';

describe('AzureMonitor', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { subscriptionId: SUB_ID },
    secrets: {
      tokenUrl: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
      clientId: 'client-id',
      clientSecret: 'client-secret',
    },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(AzureMonitor).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.azure_monitor');
    expect(spec).toBe(AzureMonitor);
    expect(spec?.actions.listAlerts).toBeDefined();
    expect(spec?.actions.listAlerts.isTool).toBe(true);
  });

  it('has a leading-dot connector id', () => {
    expect(AzureMonitor.metadata.id).toBe('.azure_monitor');
  });

  it('exposes every action as an agent-discoverable tool', () => {
    const actionNames = Object.keys(AzureMonitor.actions);
    expect(actionNames.length).toBeGreaterThan(0);
    for (const name of actionNames) {
      expect(AzureMonitor.actions[name].isTool).toBe(true);
      expect(AzureMonitor.actions[name].description).toBeTruthy();
    }
  });

  it('enables the test-connector handler', () => {
    expect(AzureMonitor.test?.enabled).toBe(true);
  });

  describe('missing subscriptionId configuration', () => {
    it('rejects with a formatted error instead of throwing a raw config error', async () => {
      const ctx = { ...mockContext, config: {} } as unknown as ActionContext;

      await expect(AzureMonitor.actions.listAlerts.handler(ctx, undefined)).rejects.toThrow(
        'Azure API request failed: Azure Monitor connector is missing the required subscriptionId configuration field.'
      );
      expect(mockClient.get).not.toHaveBeenCalled();
    });
  });

  describe('listAlerts action', () => {
    it('fetches alerts scoped to the subscription with only api-version by default', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      const result = await AzureMonitor.actions.listAlerts.handler(mockContext, undefined);

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/providers/Microsoft.AlertsManagement/alerts`,
        { params: { 'api-version': '2019-03-01' } }
      );
      expect(result).toEqual({ value: [] });
    });

    it('passes optional filters through as params', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureMonitor.actions.listAlerts.handler(mockContext, {
        severity: 'Sev0',
        alertState: 'New',
        pageCount: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(expect.any(String), {
        params: expect.objectContaining({ severity: 'Sev0', alertState: 'New', pageCount: 10 }),
      });
    });

    it('throws a formatted Azure error on failure', async () => {
      mockClient.get.mockRejectedValue({
        response: { data: { error: { code: 'SubscriptionNotFound', message: 'nope' } } },
      });

      await expect(AzureMonitor.actions.listAlerts.handler(mockContext, undefined)).rejects.toThrow(
        'Azure API error [SubscriptionNotFound]: nope'
      );
    });
  });

  describe('getAlert / getAlertHistory / changeAlertState actions', () => {
    it('URL-encodes the alertId path segment', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await AzureMonitor.actions.getAlert.handler(mockContext, { alertId: 'abc/def ghi' });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/providers/Microsoft.AlertsManagement/alerts/abc%2Fdef%20ghi`,
        { params: { 'api-version': '2019-03-01' } }
      );
    });

    it('gets alert history at the /history sub-path', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureMonitor.actions.getAlertHistory.handler(mockContext, { alertId: 'a1' });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/providers/Microsoft.AlertsManagement/alerts/a1/history`,
        { params: { 'api-version': '2019-03-01' } }
      );
    });

    it('changes alert state with a default empty comment', async () => {
      mockClient.post.mockResolvedValue({ data: { alertState: 'Acknowledged' } });

      await AzureMonitor.actions.changeAlertState.handler(mockContext, {
        alertId: 'a1',
        newState: 'Acknowledged',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/providers/Microsoft.AlertsManagement/alerts/a1/changestate`,
        { comments: '' },
        { params: { 'api-version': '2019-03-01', newState: 'Acknowledged' } }
      );
    });

    it('passes the comment through when provided', async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      await AzureMonitor.actions.changeAlertState.handler(mockContext, {
        alertId: 'a1',
        newState: 'Closed',
        comment: 'False positive',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        expect.any(String),
        { comments: 'False positive' },
        expect.any(Object)
      );
    });
  });

  describe('getAlertSummary action', () => {
    it('joins groupBy into a comma-separated param', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await AzureMonitor.actions.getAlertSummary.handler(mockContext, {
        groupBy: ['severity', 'alertState'],
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/providers/Microsoft.AlertsManagement/alertsSummary`,
        { params: { 'api-version': '2019-03-01', groupby: 'severity,alertState' } }
      );
    });
  });

  describe('queryMetrics action', () => {
    it('builds the metrics URL from the full resource id and joins metricNames', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureMonitor.actions.queryMetrics.handler(mockContext, {
        resourceId:
          '/subscriptions/x/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1',
        metricNames: ['Percentage CPU', 'Network In'],
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/x/resourceGroups/rg1/providers/Microsoft.Compute/virtualMachines/vm1/providers/Microsoft.Insights/metrics`,
        { params: { 'api-version': '2023-10-01', metricnames: 'Percentage CPU,Network In' } }
      );
    });
  });

  describe('runLogQuery action', () => {
    const WORKSPACE_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    it('mints a Log Analytics-scoped token separately from the ARM token and uses it as the request Authorization header', async () => {
      mockClient.post.mockResolvedValueOnce({ data: { access_token: 'log-analytics-token' } });
      mockClient.post.mockResolvedValueOnce({ data: { tables: [] } });

      const result = await AzureMonitor.actions.runLogQuery.handler(mockContext, {
        workspaceId: WORKSPACE_ID,
        query: 'AzureActivity | take 1',
      });

      const [tokenUrl, tokenBody, tokenOptions] = mockClient.post.mock.calls[0];
      expect(tokenUrl).toBe('https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token');
      expect(tokenBody).toContain('grant_type=client_credentials');
      expect(tokenBody).toContain('client_id=client-id');
      expect(tokenBody).toContain('client_secret=client-secret');
      expect(tokenBody).toContain('scope=https%3A%2F%2Fapi.loganalytics.io%2F.default');
      expect(tokenOptions.headers['Content-Type']).toBe('application/x-www-form-urlencoded');

      expect(mockClient.post).toHaveBeenNthCalledWith(
        2,
        `https://api.loganalytics.azure.com/v1/workspaces/${WORKSPACE_ID}/query`,
        { query: 'AzureActivity | take 1' },
        { headers: { Authorization: 'Bearer log-analytics-token' } }
      );
      expect(result).toEqual({ tables: [] });
    });

    it('throws a clear error when the connector is not configured with client-credentials secrets', async () => {
      const ctx = { ...mockContext, secrets: {} } as unknown as ActionContext;

      await expect(
        AzureMonitor.actions.runLogQuery.handler(ctx, { workspaceId: WORKSPACE_ID, query: 'x' })
      ).rejects.toThrow('OAuth 2.0 Client Credentials');
    });

    it('surfaces a formatted error when the token endpoint rejects the request', async () => {
      mockClient.post.mockRejectedValueOnce({ response: { status: 401, data: 'invalid_client' } });

      await expect(
        AzureMonitor.actions.runLogQuery.handler(mockContext, {
          workspaceId: WORKSPACE_ID,
          query: 'AzureActivity',
        })
      ).rejects.toThrow(
        'Failed to obtain an access token for https://api.loganalytics.io/.default (401): invalid_client'
      );
    });
  });

  describe('queryActivityLog action (OData filter injection guard)', () => {
    it('escapes an embedded single quote in startTime so it cannot break out of the OData literal', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureMonitor.actions.queryActivityLog.handler(mockContext, {
        startTime: "2024-01-01T00:00:00Z' or '1'='1",
        endTime: '2024-01-02T00:00:00Z',
      });

      const [, options] = mockClient.get.mock.calls[0];
      expect(options.params.$filter).toBe(
        "eventTimestamp ge '2024-01-01T00:00:00Z'' or ''1''=''1' and eventTimestamp le '2024-01-02T00:00:00Z'"
      );
    });

    it('scopes to a resource group when provided, escaping embedded quotes', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureMonitor.actions.queryActivityLog.handler(mockContext, {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
        resourceGroupName: "rg-o'brien",
      });

      const [, options] = mockClient.get.mock.calls[0];
      expect(options.params.$filter).toContain("resourceGroupName eq 'rg-o''brien'");
    });

    it('scopes to a resourceId when provided instead of a resource group', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureMonitor.actions.queryActivityLog.handler(mockContext, {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
        resourceId: '/subscriptions/x/resourceGroups/rg1/providers/Microsoft.Compute/vm1',
      });

      const [, options] = mockClient.get.mock.calls[0];
      expect(options.params.$filter).toContain(
        "resourceUri eq '/subscriptions/x/resourceGroups/rg1/providers/Microsoft.Compute/vm1'"
      );
    });

    it('joins select fields with a comma', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureMonitor.actions.queryActivityLog.handler(mockContext, {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-02T00:00:00Z',
        select: ['eventName', 'status'],
      });

      const [, options] = mockClient.get.mock.calls[0];
      expect(options.params.$select).toBe('eventName,status');
    });
  });

  describe('listActivityLogAlerts / listActionGroups actions', () => {
    it('lists activity log alerts for the subscription', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureMonitor.actions.listActivityLogAlerts.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/providers/Microsoft.Insights/activityLogAlerts`,
        { params: { 'api-version': '2020-10-01' } }
      );
    });

    it('lists action groups for the subscription', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureMonitor.actions.listActionGroups.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/providers/Microsoft.Insights/actionGroups`,
        { params: { 'api-version': '2021-09-01' } }
      );
    });
  });

  describe('listMetricAlertRules / listScheduledQueryRules actions (subscription vs resource group scope)', () => {
    it('scopes listMetricAlertRules to the subscription when no resourceGroupName is given', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureMonitor.actions.listMetricAlertRules.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/providers/Microsoft.Insights/metricAlerts`,
        { params: { 'api-version': '2024-03-01-preview' } }
      );
    });

    it('scopes listMetricAlertRules to a resource group when given', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureMonitor.actions.listMetricAlertRules.handler(mockContext, {
        resourceGroupName: 'rg1',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/resourceGroups/rg1/providers/Microsoft.Insights/metricAlerts`,
        { params: { 'api-version': '2024-03-01-preview' } }
      );
    });

    it('scopes listScheduledQueryRules to the subscription when no resourceGroupName is given', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureMonitor.actions.listScheduledQueryRules.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/providers/Microsoft.Insights/scheduledQueryRules`,
        { params: { 'api-version': '2021-08-01' } }
      );
    });
  });

  describe('getMetricAlertRule / setMetricAlertRuleEnabled / getMetricAlertStatus actions', () => {
    it('URL-encodes resourceGroupName and ruleName path segments', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await AzureMonitor.actions.getMetricAlertRule.handler(mockContext, {
        resourceGroupName: 'rg one',
        ruleName: 'rule/two',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/resourceGroups/rg%20one/providers/Microsoft.Insights/metricAlerts/rule%2Ftwo`,
        { params: { 'api-version': '2024-03-01-preview' } }
      );
    });

    it('enables/disables a metric alert rule via PATCH', async () => {
      mockClient.patch.mockResolvedValue({ data: { properties: { enabled: false } } });

      await AzureMonitor.actions.setMetricAlertRuleEnabled.handler(mockContext, {
        resourceGroupName: 'rg1',
        ruleName: 'rule1',
        enabled: false,
      });

      expect(mockClient.patch).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/resourceGroups/rg1/providers/Microsoft.Insights/metricAlerts/rule1`,
        { properties: { enabled: false } },
        { params: { 'api-version': '2024-03-01-preview' } }
      );
    });

    it('gets metric alert status at the /status sub-path', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await AzureMonitor.actions.getMetricAlertStatus.handler(mockContext, {
        resourceGroupName: 'rg1',
        ruleName: 'rule1',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/resourceGroups/rg1/providers/Microsoft.Insights/metricAlerts/rule1/status`,
        { params: { 'api-version': '2024-03-01-preview' } }
      );
    });
  });

  describe('createOrUpdateAlertProcessingRule / setAlertProcessingRuleEnabled actions', () => {
    it('creates a rule that suppresses all action groups', async () => {
      mockClient.put.mockResolvedValue({ data: { name: 'rule1' } });

      await AzureMonitor.actions.createOrUpdateAlertProcessingRule.handler(mockContext, {
        resourceGroupName: 'rg1',
        ruleName: 'rule1',
        scopes: [`/subscriptions/${SUB_ID}`],
        actionType: 'RemoveAllActionGroups',
        enabled: true,
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/resourceGroups/rg1/providers/Microsoft.AlertsManagement/actionRules/rule1`,
        expect.objectContaining({
          location: 'Global',
          properties: expect.objectContaining({
            scopes: [`/subscriptions/${SUB_ID}`],
            enabled: true,
            actions: [{ actionType: 'RemoveAllActionGroups' }],
          }),
        }),
        { params: { 'api-version': '2021-08-08' } }
      );
    });

    it('includes actionGroupIds only for AddActionGroups', async () => {
      mockClient.put.mockResolvedValue({ data: {} });

      await AzureMonitor.actions.createOrUpdateAlertProcessingRule.handler(mockContext, {
        resourceGroupName: 'rg1',
        ruleName: 'rule1',
        scopes: [`/subscriptions/${SUB_ID}`],
        actionType: 'AddActionGroups',
        actionGroupIds: ['ag1'],
        enabled: true,
      });

      const [, body] = mockClient.put.mock.calls[0];
      expect(body.properties.actions).toEqual([
        { actionType: 'AddActionGroups', actionGroupIds: ['ag1'] },
      ]);
    });

    it('enables/disables an alert processing rule via PATCH', async () => {
      mockClient.patch.mockResolvedValue({ data: {} });

      await AzureMonitor.actions.setAlertProcessingRuleEnabled.handler(mockContext, {
        resourceGroupName: 'rg1',
        ruleName: 'rule1',
        enabled: false,
      });

      expect(mockClient.patch).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/resourceGroups/rg1/providers/Microsoft.AlertsManagement/actionRules/rule1`,
        { properties: { enabled: false } },
        { params: { 'api-version': '2021-08-08' } }
      );
    });
  });

  describe('setScheduledQueryRuleEnabled action', () => {
    it('enables/disables a scheduled query rule via PATCH', async () => {
      mockClient.patch.mockResolvedValue({ data: {} });

      await AzureMonitor.actions.setScheduledQueryRuleEnabled.handler(mockContext, {
        resourceGroupName: 'rg1',
        ruleName: 'rule1',
        enabled: true,
      });

      expect(mockClient.patch).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/resourceGroups/rg1/providers/Microsoft.Insights/scheduledQueryRules/rule1`,
        { properties: { enabled: true } },
        { params: { 'api-version': '2021-08-01' } }
      );
    });
  });

  describe('error extraction (extractAzureErrorMessage / throwAzureError)', () => {
    it('formats an Azure API error body with a code', async () => {
      mockClient.get.mockRejectedValue({
        response: { data: { error: { code: 'ResourceGroupNotFound', message: 'not found' } } },
      });

      await expect(AzureMonitor.actions.listActionGroups.handler(mockContext, {})).rejects.toThrow(
        'Azure API error [ResourceGroupNotFound]: not found'
      );
    });

    it('reports a clean 401', async () => {
      mockClient.get.mockRejectedValue({ response: { status: 401, data: 'unauthorized' } });

      await expect(AzureMonitor.actions.listActionGroups.handler(mockContext, {})).rejects.toThrow(
        'Authentication failed (401)'
      );
    });

    it('reports a clean 403', async () => {
      mockClient.get.mockRejectedValue({ response: { status: 403 } });

      await expect(AzureMonitor.actions.listActionGroups.handler(mockContext, {})).rejects.toThrow(
        'Access denied (403)'
      );
    });

    it('falls back to statusText when there is no structured error body', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 500, statusText: 'Internal Server Error' },
      });

      await expect(AzureMonitor.actions.listActionGroups.handler(mockContext, {})).rejects.toThrow(
        'Azure API request failed: Internal Server Error'
      );
    });

    it('falls back to the raw error message when there is no response at all', async () => {
      mockClient.get.mockRejectedValue(new Error('network timeout'));

      await expect(AzureMonitor.actions.listActionGroups.handler(mockContext, {})).rejects.toThrow(
        'Azure API request failed: network timeout'
      );
    });
  });

  describe('test handler', () => {
    it('reports success with the action group count', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [{ id: 'ag1' }, { id: 'ag2' }] } });

      const result = await AzureMonitor.test.handler(mockContext);

      expect(result.message).toContain('2 action group(s)');
    });

    it('rejects with a formatted Azure error on failure instead of resolving with { ok: false }', async () => {
      mockClient.get.mockRejectedValue({ response: { status: 401, data: 'unauthorized' } });

      if (!AzureMonitor.test) throw new Error('Test handler not defined');
      await expect(AzureMonitor.test.handler(mockContext)).rejects.toThrow(
        'Authentication failed (401)'
      );
    });
  });
});
