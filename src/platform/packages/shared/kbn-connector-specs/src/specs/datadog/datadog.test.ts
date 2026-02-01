/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import type {
  DatadogAlertEventsResponse,
  DatadogMonitorsResponse,
} from '@kbn/alerting-v2-external-alerts-schema';
import { DatadogConnector } from './datadog';

/**
 * Example Datadog v2 API event response (attributes.attributes structure)
 * This is a real response from the Datadog Events API v2 for a monitor alert.
 */
const exampleDatadogEventAttributes = {
  _dd: {
    evt: {
      from_events_to_logs: true,
    },
    has_notification: false,
    internal: '1',
    is_shadow: false,
    source_type_name: 'Monitor Alert',
    version: '1',
  },
  aggregation_key: '0f8cbfc9256885b77e398623ae1dd861',
  duration: 300000000000,
  event_object: '361726787d61e7f9b5347c1d6c6ef63f',
  evt: {
    id: '8481292148889028556',
    integration_id: 'monitor-alert-event',
    name: 'Example monitor from message processor',
    source_id: 36,
    type: 'log_alert',
    uid: 'AZwPiq3GAACIVXX7CdH5KgAA',
  },
  monitor: {
    alert_cycle_key_txt: '8481287114256648019',
    created_at: 1769087731000,
    draft_status: 'draft',
    group_status: 0,
    groups: ['@host.name:admin-console.prod.012'],
    id: 98219311,
    message: 'Example Monitor message',
    modified: 1769087731000,
    name: 'Example monitor from message processor',
    options: {
      enable_logs_sample: true,
      groupby_simple_monitor: false,
      include_tags: true,
      new_group_delay: 60,
      notify_audit: false,
      on_missing_data: 'default',
      thresholds: {
        critical: 3,
        warning: 1,
      },
    },
    priority: 0,
    query: 'logs("@log.level:ERROR").index("*").rollup("count").by("@host.name").last("5m") > 3',
    result: {
      alert_url:
        '/monitors/98219311?group=%40host.name%3Aadmin-console.prod.012&from_ts=1769786311000&to_ts=1769787511000&event_id=8481292148889028556&link_source=monitor_notif',
      group_key: '@host.name',
      logs_url:
        '/logs/analytics?query=%40log.level%3AERROR&from_ts=1769786911000&to_ts=1769787211000&live=false&agg_m=count&agg_t=count&agg_q=%40host.name&index=%2A&link_source=monitor_notif',
      result_id: 8481292146324828000,
      result_id_txt: '8481292146324828319',
      result_ts: 1769787211,
    },
    templated_name: 'Example monitor from message processor on @host.name:admin-console.prod.012',
    transition: {
      destination_state: 'OK',
      source_state: 'Warn',
      transition_type: 'warning recovery',
    },
    type: 'log alert',
  },
  monitor_groups: ['@host.name:admin-console.prod.012'],
  monitor_id: 98219311,
  priority: 'normal',
  service: 'undefined',
  sourcecategory: 'monitor_alert',
  status: 'success',
  timestamp: 1769787211000,
  title:
    '[Recovered on {@host.name:admin-console.prod.012}] Example monitor from message processor',
};

interface HttpError extends Error {
  response?: {
    status: number;
    data?: unknown;
  };
}

describe('DatadogConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: {
      site: 'datadoghq.com',
      appKey: 'test-app-key',
    },
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct connector metadata', () => {
      expect(DatadogConnector.metadata.id).toBe('.datadog');
      expect(DatadogConnector.metadata.displayName).toBe('Datadog');
      expect(DatadogConnector.metadata.minimumLicense).toBe('enterprise');
      expect(DatadogConnector.metadata.isExperimental).toBe(true);
    });
  });

  describe('listMonitors action', () => {
    it('should list monitors successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: 12345,
            name: 'CPU Monitor',
            type: 'metric alert',
            message: 'CPU is high',
            overall_state: 'OK',
            tags: ['env:production', 'team:platform'],
            priority: 2,
          },
          {
            id: 67890,
            name: 'Memory Monitor',
            type: 'metric alert',
            message: 'Memory is high',
            overall_state: 'Alert',
            tags: ['env:staging'],
            priority: 1,
          },
        ],
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await DatadogConnector.actions.listMonitors.handler(
        mockContext,
        {}
      )) as DatadogMonitorsResponse;

      expect(mockClient.get).toHaveBeenCalledWith('https://api.datadoghq.com/api/v1/monitor', {
        params: {},
        headers: {
          'DD-APPLICATION-KEY': 'test-app-key',
        },
        maxContentLength: 5 * 1024 * 1024,
      });
      expect(result.monitors).toHaveLength(2);
      expect(result.monitors[0].name).toBe('CPU Monitor');
      expect(result.total).toBe(2);

      // Raw monitor should be preserved
      expect(result.monitors[0].rawMonitor).toBeDefined();
      expect(result.monitors[0].rawMonitor.id).toBe(12345);
    });

    it('should pass filter parameters correctly', async () => {
      const mockResponse = { data: [] };
      mockClient.get.mockResolvedValue(mockResponse);

      await DatadogConnector.actions.listMonitors.handler(mockContext, {
        tags: 'env:production',
        name: 'CPU',
        page: 0,
        pageSize: 50,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.datadoghq.com/api/v1/monitor', {
        params: {
          tags: 'env:production',
          name: 'CPU',
          page: 0,
          page_size: 50,
        },
        headers: {
          'DD-APPLICATION-KEY': 'test-app-key',
        },
        maxContentLength: 5 * 1024 * 1024,
      });
    });

    it('should use custom site from config', async () => {
      const customContext = {
        ...mockContext,
        config: { site: 'datadoghq.eu', appKey: 'test-app-key' },
      } as unknown as ActionContext;
      const mockResponse = { data: [] };
      mockClient.get.mockResolvedValue(mockResponse);

      await DatadogConnector.actions.listMonitors.handler(customContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.datadoghq.eu/api/v1/monitor',
        expect.any(Object)
      );
    });

    it('should handle empty monitor list', async () => {
      const mockResponse = { data: [] };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await DatadogConnector.actions.listMonitors.handler(
        mockContext,
        {}
      )) as DatadogMonitorsResponse;

      expect(result.monitors).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle API errors', async () => {
      const error: HttpError = new Error('Forbidden');
      error.response = { status: 403 };
      mockClient.get.mockRejectedValue(error);

      await expect(DatadogConnector.actions.listMonitors.handler(mockContext, {})).rejects.toThrow(
        'Forbidden'
      );
    });
  });

  describe('getAlertEvents action', () => {
    // Use the real example event structure from Datadog API v2
    const mockV2Response = {
      data: {
        data: [
          {
            id: 'AwAAAZwPibz4aDY7WwAAABhBWndQaXF0QkFBQ0tGMWNGT1Z4U0p4aUQAAAAkMTE5YzBmODktYmNmOC00ZTEzLWFlM2UtMmE5NmM2ZDJmNDI0AAAAAA',
            type: 'event',
            attributes: {
              tags: ['host.name:admin-console.prod.012', 'monitor', 'source:alert'],
              message:
                '%%%\nExample Monitor message\n\nLess than or exactly **1.0** log events matched in the last **5m**...\n%%%',
              attributes: exampleDatadogEventAttributes,
            },
          },
        ],
        meta: {
          page: {
            after: 'cursor-xyz',
          },
        },
      },
    };

    it('should fetch alert events with start/end timestamps', async () => {
      mockClient.post.mockResolvedValue(mockV2Response);

      const result = (await DatadogConnector.actions.getAlertEvents.handler(mockContext, {
        timeRange: {
          from: 1705312200000, // 2024-01-15T10:30:00.000Z
          to: 1705315800000, // 2024-01-15T11:30:00.000Z
        },
      })) as DatadogAlertEventsResponse;

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v2/events/search',
        expect.objectContaining({
          filter: expect.objectContaining({
            query: 'source:alert',
          }),
        }),
        expect.objectContaining({
          headers: { 'DD-APPLICATION-KEY': 'test-app-key' },
          maxContentLength: 5 * 1024 * 1024,
        })
      );
      expect(result.events).toHaveLength(1);
      expect(result.events[0].title).toBe(exampleDatadogEventAttributes.title);
      expect(result.nextCursor).toBe('cursor-xyz');
    });

    it('should fetch alert events with lookback window', async () => {
      mockClient.post.mockResolvedValue(mockV2Response);

      const result = (await DatadogConnector.actions.getAlertEvents.handler(mockContext, {
        timeRange: {
          lookbackWindow: '15m',
        },
      })) as DatadogAlertEventsResponse;

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v2/events/search',
        expect.objectContaining({
          filter: expect.objectContaining({
            query: 'source:alert',
          }),
        }),
        expect.any(Object)
      );
      expect(result.events).toHaveLength(1);
    });

    it('should append additional query to source:alert filter', async () => {
      mockClient.post.mockResolvedValue({ data: { data: [], meta: {} } });

      await DatadogConnector.actions.getAlertEvents.handler(mockContext, {
        timeRange: { lookbackWindow: '1h' },
        additionalQuery: 'tag:production',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v2/events/search',
        expect.objectContaining({
          filter: expect.objectContaining({
            query: 'source:alert tag:production',
          }),
        }),
        expect.any(Object)
      );
    });

    it('should include pagination parameters', async () => {
      mockClient.post.mockResolvedValue({ data: { data: [], meta: {} } });

      await DatadogConnector.actions.getAlertEvents.handler(mockContext, {
        timeRange: { lookbackWindow: '1h' },
        pageLimit: 100,
        pageCursor: 'cursor-abc',
        sort: '-timestamp',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v2/events/search',
        expect.objectContaining({
          page: {
            limit: 100,
            cursor: 'cursor-abc',
          },
          sort: '-timestamp',
        }),
        expect.any(Object)
      );
    });

    it('should map v2 response to flattened schema', async () => {
      mockClient.post.mockResolvedValue(mockV2Response);

      const result = (await DatadogConnector.actions.getAlertEvents.handler(mockContext, {
        timeRange: { lookbackWindow: '1h' },
      })) as DatadogAlertEventsResponse;

      const event = result.events[0];
      // Basic event fields
      expect(event.id).toBe(
        'AwAAAZwPibz4aDY7WwAAABhBWndQaXF0QkFBQ0tGMWNGT1Z4U0p4aUQAAAAkMTE5YzBmODktYmNmOC00ZTEzLWFlM2UtMmE5NmM2ZDJmNDI0AAAAAA'
      );
      expect(event.title).toBe(exampleDatadogEventAttributes.title);
      expect(event.message).toContain('Example Monitor message');
      expect(event.timestamp).toBe(exampleDatadogEventAttributes.timestamp);
      expect(event.tags).toEqual(['host.name:admin-console.prod.012', 'monitor', 'source:alert']);
      expect(event.status).toBe(exampleDatadogEventAttributes.status);
      expect(event.aggregationKey).toBe(exampleDatadogEventAttributes.aggregation_key);
      expect(event.duration).toBe(exampleDatadogEventAttributes.duration);
      expect(event.priority).toBe(exampleDatadogEventAttributes.priority);
      expect(event.monitorGroups).toEqual(exampleDatadogEventAttributes.monitor_groups);

      // Monitor transition fields (from real Datadog response)
      expect(event.monitor?.id).toBe(exampleDatadogEventAttributes.monitor.id);
      expect(event.monitor?.name).toBe(exampleDatadogEventAttributes.monitor.name);
      expect(event.monitor?.transition?.destination_state).toBe(
        exampleDatadogEventAttributes.monitor.transition.destination_state
      );
      expect(event.monitor?.transition?.source_state).toBe(
        exampleDatadogEventAttributes.monitor.transition.source_state
      );
      expect(event.monitor?.transition?.transition_type).toBe(
        exampleDatadogEventAttributes.monitor.transition.transition_type
      );

      // Monitor result fields
      expect(event.monitor?.result?.alert_url).toBe(
        exampleDatadogEventAttributes.monitor.result.alert_url
      );
      expect(event.monitor?.result?.logs_url).toBe(
        exampleDatadogEventAttributes.monitor.result.logs_url
      );
      expect(event.monitor?.result?.group_key).toBe(
        exampleDatadogEventAttributes.monitor.result.group_key
      );

      // Raw event should be preserved
      expect(event.rawEvent).toBeDefined();
      expect(event.rawEvent?.type).toBe('event');
    });

    it('should handle empty response', async () => {
      mockClient.post.mockResolvedValue({ data: { data: [], meta: {} } });

      const result = (await DatadogConnector.actions.getAlertEvents.handler(mockContext, {
        timeRange: { lookbackWindow: '1h' },
      })) as DatadogAlertEventsResponse;

      expect(result.events).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should handle API errors', async () => {
      const error: HttpError = new Error('Rate limit exceeded');
      error.response = { status: 429 };
      mockClient.post.mockRejectedValue(error);

      await expect(
        DatadogConnector.actions.getAlertEvents.handler(mockContext, {
          timeRange: { lookbackWindow: '1h' },
        })
      ).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('test handler', () => {
    it('should return success when all permissions are available', async () => {
      // Mock validate response
      mockClient.get.mockResolvedValueOnce({ data: { valid: true } });
      // Mock monitors check
      mockClient.get.mockResolvedValueOnce({ data: [] });
      // Mock events check
      mockClient.post.mockResolvedValueOnce({ data: { data: [] } });

      if (!DatadogConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await DatadogConnector.test.handler(mockContext);

      expect(result.ok).toBe(true);
      expect(result.message).toContain('Successfully connected');
    });

    it('should return failure for invalid API key', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { valid: false } });

      if (!DatadogConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await DatadogConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Invalid API key');
    });

    it('should return failure when monitors_read permission is missing', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { valid: true } });
      const error: HttpError = new Error('Forbidden');
      error.response = { status: 403 };
      mockClient.get.mockRejectedValueOnce(error);

      if (!DatadogConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await DatadogConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('monitors_read');
    });

    it('should return failure when events_read permission is missing', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { valid: true } });
      mockClient.get.mockResolvedValueOnce({ data: [] });
      const error: HttpError = new Error('Forbidden');
      error.response = { status: 403 };
      mockClient.post.mockRejectedValueOnce(error);

      if (!DatadogConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await DatadogConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('events_read');
    });

    it('should handle 401 unauthorized error', async () => {
      const error: HttpError = new Error('Unauthorized');
      error.response = { status: 401 };
      mockClient.get.mockRejectedValueOnce(error);

      if (!DatadogConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await DatadogConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Invalid API key');
    });

    it('should call correct API endpoints', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { valid: true } });
      mockClient.get.mockResolvedValueOnce({ data: [] });
      mockClient.post.mockResolvedValueOnce({ data: { data: [] } });

      if (!DatadogConnector.test) {
        throw new Error('Test handler not defined');
      }
      await DatadogConnector.test.handler(mockContext);

      // Verify validate endpoint was called
      expect(mockClient.get).toHaveBeenNthCalledWith(
        1,
        'https://api.datadoghq.com/api/v1/validate'
      );

      // Verify monitors endpoint was called
      expect(mockClient.get).toHaveBeenNthCalledWith(
        2,
        'https://api.datadoghq.com/api/v1/monitor',
        expect.objectContaining({
          params: { page_size: 1 },
          headers: { 'DD-APPLICATION-KEY': 'test-app-key' },
        })
      );

      // Verify events endpoint was called (v2 POST)
      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.datadoghq.com/api/v2/events/search',
        expect.objectContaining({
          filter: expect.objectContaining({ query: 'source:alert' }),
          page: { limit: 1 },
        }),
        expect.objectContaining({
          headers: { 'DD-APPLICATION-KEY': 'test-app-key' },
        })
      );
    });

    it('should include details in success response', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { valid: true } });
      mockClient.get.mockResolvedValueOnce({ data: [] });
      mockClient.post.mockResolvedValueOnce({ data: { data: [] } });

      if (!DatadogConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await DatadogConnector.test.handler(mockContext);

      expect(result.ok).toBe(true);
      expect(result.details).toBeDefined();
      const details = result.details as { apiKeyValid: boolean; eventsApiVersion: string };
      expect(details.apiKeyValid).toBe(true);
      expect(details.eventsApiVersion).toBe('v2');
    });

    it('should use custom site from config', async () => {
      const euContext = {
        ...mockContext,
        config: { site: 'datadoghq.eu', appKey: 'test-app-key' },
      };
      mockClient.get.mockResolvedValueOnce({ data: { valid: true } });
      mockClient.get.mockResolvedValueOnce({ data: [] });
      mockClient.post.mockResolvedValueOnce({ data: { data: [] } });

      if (!DatadogConnector.test) {
        throw new Error('Test handler not defined');
      }
      await DatadogConnector.test.handler(euContext);

      expect(mockClient.get).toHaveBeenNthCalledWith(1, 'https://api.datadoghq.eu/api/v1/validate');
      expect(mockClient.get).toHaveBeenNthCalledWith(
        2,
        'https://api.datadoghq.eu/api/v1/monitor',
        expect.anything()
      );
      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.datadoghq.eu/api/v2/events/search',
        expect.anything(),
        expect.anything()
      );
    });

    it('should handle API error response with errors array', async () => {
      const error: HttpError = new Error('Bad Request');
      error.response = { status: 400, data: { errors: ['Invalid query', 'Missing field'] } };
      mockClient.get.mockRejectedValueOnce(error);

      if (!DatadogConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await DatadogConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Invalid query, Missing field');
    });
  });

  describe('schema validation', () => {
    it('should validate site enum', () => {
      const schema = DatadogConnector.schema;
      if (!schema) {
        throw new Error('Schema not defined');
      }

      const validResult = schema.safeParse({ site: 'datadoghq.com', appKey: 'test-key' });
      expect(validResult.success).toBe(true);

      const euResult = schema.safeParse({ site: 'datadoghq.eu', appKey: 'test-key' });
      expect(euResult.success).toBe(true);

      const invalidResult = schema.safeParse({ site: 'invalid.com', appKey: 'test-key' });
      expect(invalidResult.success).toBe(false);
    });

    it('should require appKey', () => {
      const schema = DatadogConnector.schema;
      if (!schema) {
        throw new Error('Schema not defined');
      }

      const result = schema.safeParse({ site: 'datadoghq.com' });
      expect(result.success).toBe(false);
    });

    it('should use default site when not provided', () => {
      const schema = DatadogConnector.schema;
      if (!schema) {
        throw new Error('Schema not defined');
      }

      const result = schema.safeParse({ appKey: 'test-key' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.site).toBe('datadoghq.com');
      }
    });
  });
});
