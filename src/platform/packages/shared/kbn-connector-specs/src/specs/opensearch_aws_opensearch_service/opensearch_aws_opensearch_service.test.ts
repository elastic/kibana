/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, AuthTypeDef } from '../../connector_spec';
import { OpensearchAwsOpensearchService } from './opensearch_aws_opensearch_service';
import { GetDetectorFindingsInputSchema, UpdateMonitorInputSchema } from './types';

const ENDPOINT = 'https://search-my-domain-abc123.us-east-1.es.amazonaws.com';

describe('OpenSearch (AWS OpenSearch Service) connector', () => {
  const mockRequest = jest.fn();
  const mockClient = { request: mockRequest };

  const mockContext = {
    client: mockClient,
    config: { endpoint: ENDPOINT },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const jsonResponse = (data: unknown) => ({ data });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has the expected id and display name', () => {
      expect(OpensearchAwsOpensearchService.metadata.id).toBe('.opensearch_aws_opensearch_service');
      expect(OpensearchAwsOpensearchService.metadata.displayName).toBe(
        'OpenSearch (AWS OpenSearch Service)'
      );
    });

    it('only declares agentBuilder support (new connector, pre Production-NonCanary)', () => {
      expect(OpensearchAwsOpensearchService.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });
  });

  describe('auth', () => {
    it('offers both aws_credentials (recommended) and basic', () => {
      const types = OpensearchAwsOpensearchService.auth?.types ?? [];
      const awsAuth = types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'aws_credentials'
      );
      const basicAuth = types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'basic'
      );
      expect(awsAuth?.isRecommended).toBe(true);
      expect(basicAuth).toBeDefined();
    });
  });

  describe('acknowledgeAlert', () => {
    it('posts the alert IDs to the acknowledge endpoint', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ success: ['alert-1'], failed: [] }));

      const result = await OpensearchAwsOpensearchService.actions.acknowledgeAlert.handler(
        mockContext,
        { monitorId: 'monitor-1', alertIds: ['alert-1'] }
      );

      expect(mockRequest).toHaveBeenCalledWith({
        url: `${ENDPOINT}/_plugins/_alerting/monitors/monitor-1/_acknowledge/alerts`,
        method: 'POST',
        params: undefined,
        data: { alerts: ['alert-1'] },
      });
      expect(result).toEqual({ success: ['alert-1'], failed: [] });
    });

    it('URL-encodes the monitor ID', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ success: [], failed: [] }));

      await OpensearchAwsOpensearchService.actions.acknowledgeAlert.handler(mockContext, {
        monitorId: 'monitor/1',
        alertIds: ['alert-1'],
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${ENDPOINT}/_plugins/_alerting/monitors/monitor%2F1/_acknowledge/alerts`,
        })
      );
    });
  });

  describe('getAlerts', () => {
    it('passes through only the provided filters as query params', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ alerts: [], totalAlerts: 0 }));

      await OpensearchAwsOpensearchService.actions.getAlerts.handler(mockContext, {
        alertState: 'ACTIVE',
      });

      expect(mockRequest).toHaveBeenCalledWith({
        url: `${ENDPOINT}/_plugins/_alerting/monitors/alerts`,
        method: 'GET',
        params: {
          monitorId: undefined,
          alertState: 'ACTIVE',
          severityLevel: undefined,
          searchString: undefined,
          sortString: undefined,
          sortOrder: undefined,
          size: undefined,
          startIndex: undefined,
        },
        data: undefined,
      });
    });
  });

  describe('executeMonitor', () => {
    it('includes dryrun only when provided', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ monitor_name: 'm', trigger_results: {} }));

      await OpensearchAwsOpensearchService.actions.executeMonitor.handler(mockContext, {
        monitorId: 'monitor-1',
        dryrun: true,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${ENDPOINT}/_plugins/_alerting/monitors/monitor-1/_execute`,
          method: 'POST',
          params: { dryrun: true },
        })
      );
    });

    it('omits the dryrun param when not provided', async () => {
      mockRequest.mockResolvedValue(jsonResponse({}));

      await OpensearchAwsOpensearchService.actions.executeMonitor.handler(mockContext, {
        monitorId: 'monitor-1',
      });

      expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({ params: undefined }));
    });
  });

  describe('getMonitor', () => {
    it('flattens the monitor body alongside its id', async () => {
      mockRequest.mockResolvedValue(
        jsonResponse({
          _id: 'monitor-1',
          _seq_no: 3,
          _primary_term: 1,
          monitor: { name: 'test-monitor', enabled: true },
        })
      );

      const result = await OpensearchAwsOpensearchService.actions.getMonitor.handler(mockContext, {
        monitorId: 'monitor-1',
      });

      expect(result).toEqual({ id: 'monitor-1', name: 'test-monitor', enabled: true });
    });
  });

  describe('enableMonitor / disableMonitor', () => {
    it('fetches the current monitor and PUTs it back with enabled toggled and concurrency params', async () => {
      mockRequest
        .mockResolvedValueOnce(
          jsonResponse({
            _id: 'monitor-1',
            _seq_no: 5,
            _primary_term: 2,
            monitor: { name: 'test-monitor', enabled: false, schedule: {} },
          })
        )
        .mockResolvedValueOnce(jsonResponse({ _id: 'monitor-1' }));

      const result = await OpensearchAwsOpensearchService.actions.enableMonitor.handler(
        mockContext,
        { monitorId: 'monitor-1' }
      );

      expect(mockRequest).toHaveBeenNthCalledWith(1, {
        url: `${ENDPOINT}/_plugins/_alerting/monitors/monitor-1`,
        method: 'GET',
        params: undefined,
        data: undefined,
      });
      expect(mockRequest).toHaveBeenNthCalledWith(2, {
        url: `${ENDPOINT}/_plugins/_alerting/monitors/monitor-1`,
        method: 'PUT',
        params: { if_seq_no: 5, if_primary_term: 2 },
        data: { name: 'test-monitor', enabled: true, schedule: {} },
      });
      expect(result).toEqual({
        monitorId: 'monitor-1',
        enabled: true,
        message: 'Monitor enabled.',
      });
    });

    it('disableMonitor sets enabled to false', async () => {
      mockRequest
        .mockResolvedValueOnce(
          jsonResponse({
            _id: 'monitor-1',
            _seq_no: 5,
            _primary_term: 2,
            monitor: { name: 'test-monitor', enabled: true },
          })
        )
        .mockResolvedValueOnce(jsonResponse({ _id: 'monitor-1' }));

      const result = await OpensearchAwsOpensearchService.actions.disableMonitor.handler(
        mockContext,
        { monitorId: 'monitor-1' }
      );

      expect(mockRequest).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ data: { name: 'test-monitor', enabled: false } })
      );
      expect(result).toEqual({
        monitorId: 'monitor-1',
        enabled: false,
        message: 'Monitor disabled.',
      });
    });
  });

  describe('searchMonitors', () => {
    it('builds a match_all query when no filters are provided', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ hits: { hits: [] } }));

      await OpensearchAwsOpensearchService.actions.searchMonitors.handler(mockContext, {});

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${ENDPOINT}/_plugins/_alerting/monitors/_search`,
          method: 'POST',
          data: { query: { match_all: {} }, size: 20, from: 0 },
        })
      );
    });

    it('combines name, enabled, and index filters into a bool query', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ hits: { hits: [] } }));

      await OpensearchAwsOpensearchService.actions.searchMonitors.handler(mockContext, {
        name: 'cpu',
        enabled: true,
        index: 'metrics-*',
        size: 5,
        from: 10,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            query: {
              bool: {
                must: [
                  { match: { 'monitor.name': 'cpu' } },
                  { term: { 'monitor.enabled': true } },
                  {
                    bool: {
                      should: [
                        { match: { 'monitor.inputs.search.indices': 'metrics-*' } },
                        { match: { 'monitor.inputs.doc_level_input.indices': 'metrics-*' } },
                      ],
                      minimum_should_match: 1,
                    },
                  },
                ],
              },
            },
            size: 5,
            from: 10,
          },
        })
      );
    });
  });

  describe('createMonitor', () => {
    it('maps camelCase input to the OpenSearch monitor body', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ _id: 'new-monitor-id' }));

      const result = await OpensearchAwsOpensearchService.actions.createMonitor.handler(
        mockContext,
        {
          name: 'high-cpu',
          monitorType: 'query_level_monitor',
          schedule: { period: { interval: 5, unit: 'MINUTES' } },
          inputs: [{ search: { indices: ['metrics-*'], query: { size: 0 } } }],
          triggers: [
            {
              name: 'trigger-1',
              severity: '1',
              condition: { script: { source: 'return true', lang: 'painless' } },
              actions: [],
            },
          ],
          rbacRoles: ['ops-team'],
        }
      );

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${ENDPOINT}/_plugins/_alerting/monitors`,
          method: 'POST',
          data: expect.objectContaining({
            type: 'monitor',
            name: 'high-cpu',
            monitor_type: 'query_level_monitor',
            enabled: true,
            rbac_roles: ['ops-team'],
          }),
        })
      );
      expect(result).toEqual({
        monitorId: 'new-monitor-id',
        message: 'Monitor "high-cpu" was created.',
      });
    });
  });

  describe('updateMonitor', () => {
    it('merges only the provided fields into the current monitor before PUTting', async () => {
      mockRequest
        .mockResolvedValueOnce(
          jsonResponse({
            _id: 'monitor-1',
            _seq_no: 1,
            _primary_term: 1,
            monitor: {
              name: 'old-name',
              monitor_type: 'query_level_monitor',
              enabled: true,
              schedule: { period: { interval: 1, unit: 'MINUTES' } },
              inputs: [{ search: {} }],
              triggers: [{ name: 'old-trigger' }],
            },
          })
        )
        .mockResolvedValueOnce(jsonResponse({ _id: 'monitor-1' }));

      await OpensearchAwsOpensearchService.actions.updateMonitor.handler(mockContext, {
        monitorId: 'monitor-1',
        name: 'new-name',
      });

      expect(mockRequest).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          data: {
            name: 'new-name',
            monitor_type: 'query_level_monitor',
            enabled: true,
            schedule: { period: { interval: 1, unit: 'MINUTES' } },
            inputs: [{ search: {} }],
            triggers: [{ name: 'old-trigger' }],
          },
        })
      );
    });

    it('rejects an input with no fields to update', () => {
      const result = UpdateMonitorInputSchema.safeParse({ monitorId: 'monitor-1' });
      expect(result.success).toBe(false);
    });
  });

  describe('deleteMonitor', () => {
    it('sends a DELETE request and returns a confirmation message', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ result: 'deleted' }));

      const result = await OpensearchAwsOpensearchService.actions.deleteMonitor.handler(
        mockContext,
        { monitorId: 'monitor-1' }
      );

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${ENDPOINT}/_plugins/_alerting/monitors/monitor-1`,
          method: 'DELETE',
        })
      );
      expect(result).toEqual({ monitorId: 'monitor-1', message: 'Monitor deleted.' });
    });
  });

  describe('searchDetectors', () => {
    it('builds a match_all query when no filters are provided', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ hits: { hits: [] } }));

      await OpensearchAwsOpensearchService.actions.searchDetectors.handler(mockContext, {});

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${ENDPOINT}/_plugins/_security_analytics/detectors/_search`,
          method: 'POST',
          data: { query: { match_all: {} }, size: 20 },
        })
      );
    });

    it('combines name (nested) and detectorType filters', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ hits: { hits: [] } }));

      await OpensearchAwsOpensearchService.actions.searchDetectors.handler(mockContext, {
        name: 'windows-detector',
        detectorType: 'windows',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            query: {
              bool: {
                must: [
                  {
                    nested: {
                      path: 'detector',
                      query: { match: { 'detector.name': 'windows-detector' } },
                    },
                  },
                  { match: { detector_type: 'windows' } },
                ],
              },
            },
            size: 20,
          },
        })
      );
    });
  });

  describe('acknowledgeDetectorAlert', () => {
    it('posts to the Security Analytics detector acknowledge endpoint', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ acknowledged: [], failed: [], missing: [] }));

      await OpensearchAwsOpensearchService.actions.acknowledgeDetectorAlert.handler(mockContext, {
        detectorId: 'detector-1',
        alertIds: ['alert-1'],
      });

      expect(mockRequest).toHaveBeenCalledWith({
        url: `${ENDPOINT}/_plugins/_security_analytics/detectors/detector-1/_acknowledge/alerts`,
        method: 'POST',
        params: undefined,
        data: { alerts: ['alert-1'] },
      });
    });
  });

  describe('getDetectorFindings', () => {
    it('maps detectorId to the snake_case detector_id query param', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ total_findings: 0, findings: [] }));

      await OpensearchAwsOpensearchService.actions.getDetectorFindings.handler(mockContext, {
        detectorId: 'detector-1',
        severity: 'high',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${ENDPOINT}/_plugins/_security_analytics/findings/_search`,
          params: expect.objectContaining({ detector_id: 'detector-1', severity: 'high' }),
        })
      );
    });

    it('rejects an input with neither detectorId nor detectorType', () => {
      const result = GetDetectorFindingsInputSchema.safeParse({ severity: 'high' });
      expect(result.success).toBe(false);
    });
  });

  describe('listIndices', () => {
    it('lists all indices with a compact column selection when no pattern is given', async () => {
      mockRequest.mockResolvedValue(jsonResponse([{ index: 'logs-1', health: 'green' }]));

      await OpensearchAwsOpensearchService.actions.listIndices.handler(mockContext, {});

      expect(mockRequest).toHaveBeenCalledWith({
        url: `${ENDPOINT}/_cat/indices`,
        method: 'GET',
        params: { format: 'json', h: 'health,status,index,docs.count,store.size' },
        data: undefined,
      });
    });

    it('filters by pattern in the URL path when provided', async () => {
      mockRequest.mockResolvedValue(jsonResponse([]));

      await OpensearchAwsOpensearchService.actions.listIndices.handler(mockContext, {
        pattern: 'logs-*',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${ENDPOINT}/_cat/indices/logs-*` })
      );
    });
  });

  describe('runQuery', () => {
    it('posts the raw query DSL body to {index}/_search', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ hits: { hits: [] } }));

      await OpensearchAwsOpensearchService.actions.runQuery.handler(mockContext, {
        index: 'logs-*',
        query: { query: { match_all: {} }, size: 10 },
      });

      expect(mockRequest).toHaveBeenCalledWith({
        url: `${ENDPOINT}/logs-*/_search`,
        method: 'POST',
        params: undefined,
        data: { query: { match_all: {} }, size: 10 },
      });
    });
  });

  describe('indexDocument', () => {
    it('PUTs to {index}/_doc/{id} when an id is provided', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ result: 'created' }));

      await OpensearchAwsOpensearchService.actions.indexDocument.handler(mockContext, {
        index: 'my-index',
        id: 'doc-1',
        document: { message: 'hello' },
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${ENDPOINT}/my-index/_doc/doc-1`,
          method: 'PUT',
          data: { message: 'hello' },
        })
      );
    });

    it('POSTs to {index}/_doc when no id is provided', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ result: 'created' }));

      await OpensearchAwsOpensearchService.actions.indexDocument.handler(mockContext, {
        index: 'my-index',
        document: { message: 'hello' },
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${ENDPOINT}/my-index/_doc`, method: 'POST' })
      );
    });
  });

  describe('error normalization', () => {
    it('surfaces the OpenSearch error reason', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 400,
          data: { error: { type: 'illegal_argument_exception', reason: 'bad request' } },
        },
      });

      await expect(
        OpensearchAwsOpensearchService.actions.getMonitor.handler(mockContext, {
          monitorId: 'monitor-1',
        })
      ).rejects.toThrow('OpenSearch error (illegal_argument_exception): bad request');
    });

    it('gives a specific message for 403 responses', async () => {
      mockRequest.mockRejectedValue({ response: { status: 403, data: {} } });

      await expect(
        OpensearchAwsOpensearchService.actions.getMonitor.handler(mockContext, {
          monitorId: 'monitor-1',
        })
      ).rejects.toThrow('access denied');
    });
  });

  describe('test handler', () => {
    it('reports cluster name and status on success', async () => {
      mockRequest.mockResolvedValue(jsonResponse({ cluster_name: 'my-cluster', status: 'green' }));

      const result = await OpensearchAwsOpensearchService.test.handler(mockContext);

      expect(result.message).toContain('my-cluster');
      expect(result.message).toContain('green');
    });
  });
});
