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
import { GoogleCloudMonitoring } from './google_cloud_monitoring';

describe('GoogleCloudMonitoring', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { projectId: 'my-gcp-project' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata and wiring', () => {
    it('should be discoverable via getConnectorSpec', () => {
      const spec = getConnectorSpec('.google_cloud_monitoring');
      expect(spec).toBe(GoogleCloudMonitoring);
      expect(spec?.actions.listAlertPolicies.isTool).toBe(true);
    });

    it('should use the shared GCP service account auth type', () => {
      expect(GoogleCloudMonitoring.auth?.types).toEqual(['gcp_service_account']);
    });

    it('should only declare agentBuilder as a supported feature for now', () => {
      expect(GoogleCloudMonitoring.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('should describe all agent-facing actions', () => {
      const toolActions = Object.entries(GoogleCloudMonitoring.actions).filter(
        ([, action]) => action.isTool
      );
      expect(toolActions.length).toBe(Object.keys(GoogleCloudMonitoring.actions).length);
      toolActions.forEach(([, action]) => {
        expect(action.description?.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('schema', () => {
    it('should require a projectId', () => {
      const schema = GoogleCloudMonitoring.schema;
      if (!schema) {
        throw new Error('GoogleCloudMonitoring spec is missing a config schema');
      }
      expect(() => schema.parse({})).toThrow();
      expect(schema.parse({ projectId: 'my-gcp-project' })).toEqual({
        projectId: 'my-gcp-project',
      });
    });
  });

  describe('listAlertPolicies', () => {
    it('should list alert policies in the configured project', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          alertPolicies: [
            { name: 'projects/my-gcp-project/alertPolicies/123', displayName: 'High CPU' },
          ],
          nextPageToken: 'token-2',
        },
      });

      const result = await GoogleCloudMonitoring.actions.listAlertPolicies.handler(mockContext, {
        filter: 'display_name starts_with "High"',
        pageSize: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/alertPolicies',
        { params: { filter: 'display_name starts_with "High"', pageSize: 10 } }
      );
      expect(result).toEqual(expect.objectContaining({ nextPageToken: 'token-2' }));
    });

    it('should allow overriding the project for a single call', async () => {
      mockClient.get.mockResolvedValue({ data: { alertPolicies: [] } });

      await GoogleCloudMonitoring.actions.listAlertPolicies.handler(mockContext, {
        projectId: 'other-project',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/other-project/alertPolicies',
        { params: {} }
      );
    });
  });

  describe('getAlertPolicy', () => {
    it('should resolve a bare policy ID against the configured project', async () => {
      mockClient.get.mockResolvedValue({
        data: { name: 'projects/my-gcp-project/alertPolicies/123', enabled: true },
      });

      const result = await GoogleCloudMonitoring.actions.getAlertPolicy.handler(mockContext, {
        policyName: '123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/alertPolicies/123'
      );
      expect(result).toEqual(
        expect.objectContaining({ name: 'projects/my-gcp-project/alertPolicies/123' })
      );
    });

    it('should pass through a full resource name unchanged', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await GoogleCloudMonitoring.actions.getAlertPolicy.handler(mockContext, {
        policyName: 'projects/other-project/alertPolicies/456',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/other-project/alertPolicies/456'
      );
    });
  });

  describe('setAlertPolicyEnabled', () => {
    it('should PATCH only the enabled field with a matching updateMask', async () => {
      mockClient.patch.mockResolvedValue({
        data: { name: 'projects/my-gcp-project/alertPolicies/123', enabled: false },
      });

      const result = await GoogleCloudMonitoring.actions.setAlertPolicyEnabled.handler(
        mockContext,
        { policyName: '123', enabled: false }
      );

      expect(mockClient.patch).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/alertPolicies/123',
        { name: 'projects/my-gcp-project/alertPolicies/123', enabled: false },
        { params: { updateMask: 'enabled' } }
      );
      expect(result).toEqual(expect.objectContaining({ enabled: false }));
    });
  });

  describe('updateAlertPolicy', () => {
    it('should only set fields provided and build a matching updateMask', async () => {
      mockClient.patch.mockResolvedValue({ data: {} });

      await GoogleCloudMonitoring.actions.updateAlertPolicy.handler(mockContext, {
        policyName: '123',
        displayName: 'High CPU (updated)',
        notificationChannels: ['456'],
      });

      expect(mockClient.patch).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/alertPolicies/123',
        {
          name: 'projects/my-gcp-project/alertPolicies/123',
          displayName: 'High CPU (updated)',
          notificationChannels: ['projects/my-gcp-project/notificationChannels/456'],
        },
        { params: { updateMask: 'displayName,notificationChannels' } }
      );
    });

    it('should reject a call with no fields to update', () => {
      const parsed = GoogleCloudMonitoring.actions.updateAlertPolicy.input.safeParse({
        policyName: '123',
      });
      expect(parsed.success).toBe(false);
    });

    it('should scope the updateMask to only the documentation subfield provided', async () => {
      mockClient.patch.mockResolvedValue({ data: {} });

      await GoogleCloudMonitoring.actions.updateAlertPolicy.handler(mockContext, {
        policyName: '123',
        documentationSubject: 'New subject only',
      });

      expect(mockClient.patch).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/alertPolicies/123',
        {
          name: 'projects/my-gcp-project/alertPolicies/123',
          documentation: { subject: 'New subject only' },
        },
        { params: { updateMask: 'documentation.subject' } }
      );
    });

    it('should reject a policyName consisting only of dots', () => {
      const parsed = GoogleCloudMonitoring.actions.updateAlertPolicy.input.safeParse({
        policyName: '..',
        displayName: 'x',
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('createSnooze', () => {
    it('should create a snooze scoped to specific policies', async () => {
      mockClient.post.mockResolvedValue({
        data: { name: 'projects/my-gcp-project/snoozes/789' },
      });

      const result = await GoogleCloudMonitoring.actions.createSnooze.handler(mockContext, {
        displayName: 'DB maintenance window',
        startTime: '2024-01-15T00:00:00Z',
        endTime: '2024-01-15T02:00:00Z',
        policyNames: ['123'],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/snoozes',
        {
          displayName: 'DB maintenance window',
          criteria: { policies: ['projects/my-gcp-project/alertPolicies/123'] },
          interval: { startTime: '2024-01-15T00:00:00Z', endTime: '2024-01-15T02:00:00Z' },
        }
      );
      expect(result).toEqual(
        expect.objectContaining({ name: 'projects/my-gcp-project/snoozes/789' })
      );
    });

    it('should require exactly one policyName when filter is set', () => {
      const tooMany = GoogleCloudMonitoring.actions.createSnooze.input.safeParse({
        displayName: 'x',
        startTime: '2024-01-15T00:00:00Z',
        endTime: '2024-01-15T02:00:00Z',
        policyNames: ['123', '456'],
        filter: 'resource.labels.instance_id="1"',
      });
      expect(tooMany.success).toBe(false);

      const neither = GoogleCloudMonitoring.actions.createSnooze.input.safeParse({
        displayName: 'x',
        startTime: '2024-01-15T00:00:00Z',
        endTime: '2024-01-15T02:00:00Z',
      });
      expect(neither.success).toBe(false);
    });
  });

  describe('listSnoozes', () => {
    it('should list snoozes in the configured project', async () => {
      mockClient.get.mockResolvedValue({ data: { snoozes: [] } });

      await GoogleCloudMonitoring.actions.listSnoozes.handler(mockContext, {
        filter: 'interval.start_time > "2024-01-01T00:00:00Z"',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/snoozes',
        { params: { filter: 'interval.start_time > "2024-01-01T00:00:00Z"' } }
      );
    });
  });

  describe('updateSnooze', () => {
    it('should build an interval-scoped updateMask when only endTime changes', async () => {
      mockClient.patch.mockResolvedValue({ data: {} });

      await GoogleCloudMonitoring.actions.updateSnooze.handler(mockContext, {
        snoozeName: '789',
        endTime: '2024-01-15T03:00:00Z',
      });

      expect(mockClient.patch).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/snoozes/789',
        {
          name: 'projects/my-gcp-project/snoozes/789',
          interval: { endTime: '2024-01-15T03:00:00Z' },
        },
        { params: { updateMask: 'interval.endTime' } }
      );
    });

    it('should reject a call with no fields to update', () => {
      const parsed = GoogleCloudMonitoring.actions.updateSnooze.input.safeParse({
        snoozeName: '789',
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('listNotificationChannels', () => {
    it('should list notification channels in the configured project', async () => {
      mockClient.get.mockResolvedValue({ data: { notificationChannels: [] } });

      await GoogleCloudMonitoring.actions.listNotificationChannels.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/notificationChannels',
        { params: {} }
      );
    });
  });

  describe('listTimeSeries', () => {
    it('should send dotted interval/aggregation query keys and a repeated groupByFields param', async () => {
      mockClient.get.mockResolvedValue({ data: { timeSeries: [] } });

      await GoogleCloudMonitoring.actions.listTimeSeries.handler(mockContext, {
        filter: 'metric.type="compute.googleapis.com/instance/cpu/usage_time"',
        startTime: '2024-01-15T00:00:00Z',
        endTime: '2024-01-15T01:00:00Z',
        alignmentPeriod: '60s',
        perSeriesAligner: 'ALIGN_MEAN',
        crossSeriesReducer: 'REDUCE_SUM',
        groupByFields: ['resource.label.zone'],
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/timeSeries',
        {
          params: {
            filter: 'metric.type="compute.googleapis.com/instance/cpu/usage_time"',
            'interval.startTime': '2024-01-15T00:00:00Z',
            'interval.endTime': '2024-01-15T01:00:00Z',
            view: 'FULL',
            'aggregation.alignmentPeriod': '60s',
            'aggregation.perSeriesAligner': 'ALIGN_MEAN',
            'aggregation.crossSeriesReducer': 'REDUCE_SUM',
            'aggregation.groupByFields': ['resource.label.zone'],
          },
          paramsSerializer: { indexes: null },
        }
      );
    });
  });

  describe('listUptimeCheckConfigs', () => {
    it('should list uptime check configs in the configured project', async () => {
      mockClient.get.mockResolvedValue({ data: { uptimeCheckConfigs: [] } });

      await GoogleCloudMonitoring.actions.listUptimeCheckConfigs.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/uptimeCheckConfigs',
        { params: {} }
      );
    });
  });

  describe('listServices', () => {
    it('should list services in the configured project', async () => {
      mockClient.get.mockResolvedValue({ data: { services: [] } });

      await GoogleCloudMonitoring.actions.listServices.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/services',
        { params: {} }
      );
    });
  });

  describe('listServiceLevelObjectives', () => {
    it('should build the services/{id} parent path from serviceId', async () => {
      mockClient.get.mockResolvedValue({ data: { serviceLevelObjectives: [] } });

      await GoogleCloudMonitoring.actions.listServiceLevelObjectives.handler(mockContext, {
        serviceId: 'my-service',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/services/my-service/serviceLevelObjectives',
        { params: {} }
      );
    });

    it('should reject a serviceId consisting only of dots', () => {
      const parsed = GoogleCloudMonitoring.actions.listServiceLevelObjectives.input.safeParse({
        serviceId: '..',
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should surface Cloud Monitoring JSON error responses', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: { code: 404, status: 'NOT_FOUND', message: 'Alert policy not found' } },
        },
      });

      await expect(
        GoogleCloudMonitoring.actions.getAlertPolicy.handler(mockContext, { policyName: '999' })
      ).rejects.toThrow('Cloud Monitoring API error [NOT_FOUND]: Alert policy not found');
    });

    it('should handle authentication errors (401)', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 401, statusText: 'Unauthorized', data: {} },
      });

      await expect(
        GoogleCloudMonitoring.actions.listAlertPolicies.handler(mockContext, {})
      ).rejects.toThrow('Authentication failed (401)');
    });

    it('should handle authorization errors (403) and include a raw string body', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 403, statusText: 'Forbidden', data: 'insufficient scope' },
      });

      await expect(
        GoogleCloudMonitoring.actions.listAlertPolicies.handler(mockContext, {})
      ).rejects.toThrow('Access denied (403) — insufficient scope');
    });
  });

  describe('test handler', () => {
    it('should return success when the API is accessible', async () => {
      mockClient.get.mockResolvedValue({ data: { alertPolicies: [] } });

      if (!GoogleCloudMonitoring.test) {
        throw new Error('Test handler not defined');
      }
      const result = await GoogleCloudMonitoring.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://monitoring.googleapis.com/v3/projects/my-gcp-project/alertPolicies',
        { params: { pageSize: 1 } }
      );
      expect(result).toEqual({
        message: 'Successfully connected to the Cloud Monitoring API',
      });
    });

    it('should throw when the API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

      if (!GoogleCloudMonitoring.test) {
        throw new Error('Test handler not defined');
      }

      await expect(GoogleCloudMonitoring.test.handler(mockContext)).rejects.toThrow(
        'Cloud Monitoring API request failed: Invalid credentials'
      );
    });
  });
});
