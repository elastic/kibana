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
import { Datadog } from './datadog';
import { UpdateIncidentInputSchema } from './types';

describe('Datadog', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    defaults: {
      headers: { common: {} as Record<string, string> },
      auth: { username: 'api-key', password: 'app-key' } as
        | { username: string; password: string }
        | undefined,
    },
  };

  const mockContext = {
    client: mockClient,
    config: { site: 'datadoghq.com' },
    secrets: { authType: 'basic', username: 'api-key', password: 'app-key' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.defaults.headers.common = {};
    mockClient.defaults.auth = { username: 'api-key', password: 'app-key' };
  });

  it('should be defined', () => {
    expect(Datadog).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.datadog');
    expect(spec).toBe(Datadog);
    expect(spec?.actions.listMonitors).toBeDefined();
    expect(spec?.actions.listMonitors.isTool).toBe(true);
  });

  it('should have correct metadata', () => {
    expect(Datadog.metadata.id).toBe('.datadog');
    expect(Datadog.metadata.displayName).toBe('Datadog');
    expect(Datadog.metadata.minimumLicense).toBe('enterprise');
    expect(Datadog.metadata.isTechnicalPreview).toBe(true);
    expect(Datadog.metadata.supportedFeatureIds).toContain('workflows');
    expect(Datadog.metadata.supportedFeatureIds).toContain('agentBuilder');
  });

  it('should support basic auth (API key + application key)', () => {
    const types = (Datadog.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toContain('basic');
  });

  it('should keep test.enabled true', () => {
    expect(Datadog.test?.enabled).toBe(true);
  });

  describe('auth headers', () => {
    it('should map basic secrets to DD-API-KEY and DD-APPLICATION-KEY and clear axios basic auth', async () => {
      mockClient.get.mockResolvedValue({ data: [{ id: 1 }] });

      await Datadog.actions.listMonitors.handler(mockContext, {});

      expect(mockClient.defaults.headers.common['DD-API-KEY']).toBe('api-key');
      expect(mockClient.defaults.headers.common['DD-APPLICATION-KEY']).toBe('app-key');
      expect(mockClient.defaults.auth).toBeUndefined();
    });
  });

  describe('listMonitors action', () => {
    it('should GET /api/v1/monitor with comma-joined tag filters', async () => {
      mockClient.get.mockResolvedValue({ data: [{ id: 1, name: 'CPU' }] });

      const result = await Datadog.actions.listMonitors.handler(mockContext, {
        tags: ['env:prod', 'service:api'],
        groupStates: ['alert', 'warn'],
        page: 0,
        pageSize: 50,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.datadoghq.com/api/v1/monitor', {
        params: {
          tags: 'env:prod,service:api',
          monitor_tags: undefined,
          name: undefined,
          group_states: 'alert,warn',
          with_downtimes: undefined,
          page: 0,
          page_size: 50,
        },
      });
      expect(result).toEqual([{ id: 1, name: 'CPU' }]);
    });

    it('should use the regional API host for non-US1 sites', async () => {
      mockClient.get.mockResolvedValue({ data: [] });
      const euContext = {
        ...mockContext,
        config: { site: 'datadoghq.eu' },
      } as unknown as ActionContext;

      await Datadog.actions.listMonitors.handler(euContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.datadoghq.eu/api/v1/monitor',
        expect.any(Object)
      );
    });

    it('should throw a formatted error on failure', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 403, data: { errors: ['Forbidden'] } },
      });

      await expect(Datadog.actions.listMonitors.handler(mockContext, {})).rejects.toThrow(
        'Datadog listMonitors failed (status 403): Forbidden'
      );
    });
  });

  describe('getMonitor action', () => {
    it('should GET a single monitor by encoded id', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 42, name: 'Disk' } });

      const result = await Datadog.actions.getMonitor.handler(mockContext, { monitorId: 42 });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.datadoghq.com/api/v1/monitor/42', {
        params: { group_states: undefined },
      });
      expect(result).toEqual({ id: 42, name: 'Disk' });
    });
  });

  describe('getAlertEvents action', () => {
    it('should POST /api/v2/events/search and prefix source:alert when missing', async () => {
      mockClient.post.mockResolvedValue({ data: { data: [] } });

      await Datadog.actions.getAlertEvents.handler(mockContext, {
        query: 'service:api',
        from: 'now-1h',
        to: 'now',
        limit: 25,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v2/events/search',
        {
          filter: {
            query: 'source:alert service:api',
            from: 'now-1h',
            to: 'now',
          },
          page: { limit: 25 },
        }
      );
    });

    it('should not double-prefix source when already present', async () => {
      mockClient.post.mockResolvedValue({ data: { data: [] } });

      await Datadog.actions.getAlertEvents.handler(mockContext, {
        query: 'source:alert monitor_id:99',
        from: '2024-01-01T00:00:00Z',
        to: '2024-01-01T01:00:00Z',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v2/events/search',
        expect.objectContaining({
          filter: expect.objectContaining({ query: 'source:alert monitor_id:99' }),
        })
      );
    });
  });

  describe('muteMonitor / unmuteMonitor actions', () => {
    it('should POST mute with scope and end as query params', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 7, overall_state: 'Alert' } });

      await Datadog.actions.muteMonitor.handler(mockContext, {
        monitorId: 7,
        scope: 'host:web-01',
        end: 1700000000,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v1/monitor/7/mute',
        undefined,
        { params: { scope: 'host:web-01', end: 1700000000 } }
      );
    });

    it('should POST unmute with scope and all_scopes query params', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 7 } });

      await Datadog.actions.unmuteMonitor.handler(mockContext, {
        monitorId: 7,
        allScopes: true,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v1/monitor/7/unmute',
        undefined,
        { params: { scope: undefined, all_scopes: true } }
      );
    });
  });

  describe('scheduleDowntime / cancelDowntime actions', () => {
    it('should POST v2 downtime with JSON:API body and monitor_tags default', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { id: 'dt-1' } } });

      await Datadog.actions.scheduleDowntime.handler(mockContext, {
        scope: 'env:staging',
        start: '2024-06-01T10:00:00Z',
        end: '2024-06-01T12:00:00Z',
        message: 'deploy window',
      });

      expect(mockClient.post).toHaveBeenCalledWith('https://api.datadoghq.com/api/v2/downtime', {
        data: {
          type: 'downtime',
          attributes: {
            scope: 'env:staging',
            monitor_identifier: { monitor_tags: ['*'] },
            schedule: {
              start: '2024-06-01T10:00:00Z',
              end: '2024-06-01T12:00:00Z',
            },
            message: 'deploy window',
          },
        },
      });
    });

    it('should target a single monitor_id when provided', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { id: 'dt-2' } } });

      await Datadog.actions.scheduleDowntime.handler(mockContext, {
        scope: '*',
        start: '2024-06-01T10:00:00Z',
        end: '2024-06-01T12:00:00Z',
        monitorId: 99,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v2/downtime',
        expect.objectContaining({
          data: expect.objectContaining({
            attributes: expect.objectContaining({
              monitor_identifier: { monitor_id: 99 },
            }),
          }),
        })
      );
    });

    it('should DELETE v2 downtime by encoded id', async () => {
      mockClient.delete.mockResolvedValue({ data: undefined });

      const result = await Datadog.actions.cancelDowntime.handler(mockContext, {
        downtimeId: 'abc-123',
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v2/downtime/abc-123'
      );
      expect(result).toEqual({});
    });
  });

  describe('createIncident / updateIncident actions', () => {
    it('should POST /api/v2/incidents with JSON:API attributes', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { id: 'inc-1' } } });

      await Datadog.actions.createIncident.handler(mockContext, {
        title: 'API outage',
        severity: 'SEV-2',
        customerImpacted: true,
      });

      expect(mockClient.post).toHaveBeenCalledWith('https://api.datadoghq.com/api/v2/incidents', {
        data: {
          type: 'incidents',
          attributes: {
            title: 'API outage',
            customer_impacted: true,
            fields: {
              severity: {
                type: 'dropdown',
                value: 'SEV-2',
              },
            },
          },
        },
      });
    });

    it('should include detection_method in fields when provided', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { id: 'inc-1' } } });

      await Datadog.actions.createIncident.handler(mockContext, {
        title: 'API outage',
        detectionMethod: 'monitor',
      });

      expect(mockClient.post).toHaveBeenCalledWith('https://api.datadoghq.com/api/v2/incidents', {
        data: {
          type: 'incidents',
          attributes: {
            title: 'API outage',
            customer_impacted: false,
            fields: {
              detection_method: {
                type: 'dropdown',
                value: 'monitor',
              },
            },
          },
        },
      });
    });

    it('should PATCH /api/v2/incidents/{id} with partial attributes', async () => {
      mockClient.patch.mockResolvedValue({ data: { data: { id: 'inc-1' } } });

      await Datadog.actions.updateIncident.handler(mockContext, {
        incidentId: 'inc-1',
        state: 'resolved',
      });

      expect(mockClient.patch).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v2/incidents/inc-1',
        {
          data: {
            id: 'inc-1',
            type: 'incidents',
            attributes: {
              fields: {
                state: {
                  type: 'dropdown',
                  value: 'resolved',
                },
              },
            },
          },
        }
      );
    });

    it('should reject updateIncident with no fields to change', () => {
      expect(() => UpdateIncidentInputSchema.parse({ incidentId: 'inc-1' })).toThrow(
        /at least one field/i
      );
    });
  });

  describe('postEvent action', () => {
    it('should POST /api/v1/events with title, text, tags, and alert_type', async () => {
      mockClient.post.mockResolvedValue({ data: { event: { id: 1 }, status: 'ok' } });

      await Datadog.actions.postEvent.handler(mockContext, {
        title: 'Remediation complete',
        text: 'Restarted api pods',
        tags: ['env:prod', 'source:kibana'],
        alertType: 'success',
      });

      expect(mockClient.post).toHaveBeenCalledWith('https://api.datadoghq.com/api/v1/events', {
        title: 'Remediation complete',
        text: 'Restarted api pods',
        tags: ['env:prod', 'source:kibana'],
        alert_type: 'success',
      });
    });
  });

  describe('queryTimeseries action', () => {
    it('should GET /api/v1/query with query/from/to params', async () => {
      mockClient.get.mockResolvedValue({ data: { series: [] } });

      await Datadog.actions.queryTimeseries.handler(mockContext, {
        query: 'avg:system.cpu.user{*}',
        from: 1700000000,
        to: 1700003600,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.datadoghq.com/api/v1/query', {
        params: {
          query: 'avg:system.cpu.user{*}',
          from: 1700000000,
          to: 1700003600,
        },
      });
    });
  });

  describe('searchLogs action', () => {
    it('should POST /api/v2/logs/events/search with filter and page', async () => {
      mockClient.post.mockResolvedValue({ data: { data: [] } });

      await Datadog.actions.searchLogs.handler(mockContext, {
        query: 'service:api status:error',
        from: '2024-01-15T00:00:00Z',
        to: '2024-01-15T01:00:00Z',
        indexes: ['main'],
        limit: 10,
        sort: '-timestamp',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v2/logs/events/search',
        {
          filter: {
            query: 'service:api status:error',
            from: '2024-01-15T00:00:00Z',
            to: '2024-01-15T01:00:00Z',
            indexes: ['main'],
          },
          page: { limit: 10 },
          sort: '-timestamp',
        }
      );
    });
  });

  describe('test handler', () => {
    it('should GET /api/v1/validate', async () => {
      mockClient.get.mockResolvedValue({ data: { valid: true } });

      const result = await Datadog.test!.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith('https://api.datadoghq.com/api/v1/validate');
      expect(result).toEqual({});
    });
  });
});
