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
import { Prometheus } from './prometheus';

describe('Prometheus', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { baseUrl: 'https://alertmanager.example.com' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(Prometheus).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.prometheus');
    expect(spec).toBe(Prometheus);
    expect(spec?.actions.listAlerts).toBeDefined();
    expect(spec?.actions.listAlerts.isTool).toBe(true);
  });

  it('should have correct metadata', () => {
    expect(Prometheus.metadata.id).toBe('.prometheus');
    expect(Prometheus.metadata.displayName).toBe('Prometheus');
    expect(Prometheus.metadata.minimumLicense).toBe('enterprise');
  });

  it('should support basic and bearer auth', () => {
    const types = (Prometheus.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toContain('basic');
    expect(types).toContain('bearer');
  });

  it('every action is a tool with a description, and the test button is enabled', () => {
    for (const action of Object.values(Prometheus.actions)) {
      expect(action.isTool).toBe(true);
      expect(typeof action.description).toBe('string');
      expect(action.description?.length).toBeGreaterThan(0);
    }
    expect(Prometheus.test?.enabled).toBe(true);
  });

  describe('listAlerts action', () => {
    it('should fetch alerts with no params by default', async () => {
      mockClient.get.mockResolvedValue({ data: [{ labels: { alertname: 'HighCPU' } }] });

      const result = await Prometheus.actions.listAlerts.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://alertmanager.example.com/api/v2/alerts',
        { params: {}, paramsSerializer: { indexes: null } }
      );
      expect(result).toEqual({ alerts: [{ labels: { alertname: 'HighCPU' } }] });
    });

    it('should pass state flags, filter matchers, and receiver', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      await Prometheus.actions.listAlerts.handler(mockContext, {
        active: true,
        silenced: false,
        inhibited: false,
        unprocessed: true,
        filter: ['alertname="HighCPU"', 'severity=~"critical|warning"'],
        receiver: 'slack-.*',
      });

      expect(mockClient.get).toHaveBeenCalledWith(expect.any(String), {
        params: {
          active: true,
          silenced: false,
          inhibited: false,
          unprocessed: true,
          filter: ['alertname="HighCPU"', 'severity=~"critical|warning"'],
          receiver: 'slack-.*',
        },
        paramsSerializer: { indexes: null },
      });
    });

    it('should throw a formatted error on failure with a plain-string body', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 400, data: 'bad matcher expression' },
      });

      await expect(Prometheus.actions.listAlerts.handler(mockContext, {})).rejects.toThrow(
        'Alertmanager listAlerts failed (status 400): bad matcher expression'
      );
    });
  });

  describe('listSilences / getSilence actions', () => {
    it('should list silences with optional filters', async () => {
      mockClient.get.mockResolvedValue({ data: [{ id: 's1' }] });

      const result = await Prometheus.actions.listSilences.handler(mockContext, {
        filter: ['alertname="HighCPU"'],
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://alertmanager.example.com/api/v2/silences',
        { params: { filter: ['alertname="HighCPU"'] }, paramsSerializer: { indexes: null } }
      );
      expect(result).toEqual({ silences: [{ id: 's1' }] });
    });

    it('should get a single silence by id', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 's1', status: { state: 'active' } } });

      const result = await Prometheus.actions.getSilence.handler(mockContext, {
        silenceId: 's1',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://alertmanager.example.com/api/v2/silence/s1'
      );
      expect(result).toEqual({ id: 's1', status: { state: 'active' } });
    });

    it('should URL-encode a silenceId containing reserved characters', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await Prometheus.actions.getSilence.handler(mockContext, {
        silenceId: 's/1 2',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://alertmanager.example.com/api/v2/silence/s%2F1%202'
      );
    });
  });

  describe('createSilence action', () => {
    it('should create a silence with all required fields', async () => {
      mockClient.post.mockResolvedValue({ data: { silenceID: 's1' } });

      const result = await Prometheus.actions.createSilence.handler(mockContext, {
        matchers: [{ name: 'alertname', value: 'HighCPU' }],
        startsAt: '2026-01-01T00:00:00Z',
        endsAt: '2026-01-01T02:00:00Z',
        createdBy: 'workflow-bot',
        comment: 'Maintenance window on api-gateway',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://alertmanager.example.com/api/v2/silences',
        {
          matchers: [{ name: 'alertname', value: 'HighCPU', isRegex: false }],
          startsAt: '2026-01-01T00:00:00Z',
          endsAt: '2026-01-01T02:00:00Z',
          createdBy: 'workflow-bot',
          comment: 'Maintenance window on api-gateway',
        }
      );
      expect(result).toEqual({ silenceID: 's1' });
    });

    it('should default isRegex to false when omitted (Alertmanager requires it)', async () => {
      mockClient.post.mockResolvedValue({ data: { silenceID: 's2' } });

      await Prometheus.actions.createSilence.handler(mockContext, {
        matchers: [
          { name: 'alertname', value: 'HighCPU' },
          { name: 'service', value: 'api-.*', isRegex: true, isEqual: false },
        ],
        startsAt: '2026-01-01T00:00:00Z',
        endsAt: '2026-01-01T02:00:00Z',
        createdBy: 'workflow-bot',
        comment: 'Maintenance window',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://alertmanager.example.com/api/v2/silences',
        expect.objectContaining({
          matchers: [
            { name: 'alertname', value: 'HighCPU', isRegex: false },
            { name: 'service', value: 'api-.*', isRegex: true, isEqual: false },
          ],
        })
      );
    });
  });

  describe('expireSilence action', () => {
    it('should expire a silence by id', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });

      const result = await Prometheus.actions.expireSilence.handler(mockContext, {
        silenceId: 's1',
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        'https://alertmanager.example.com/api/v2/silence/s1'
      );
      expect(result).toEqual({ expired: true, silenceId: 's1' });
    });

    it('should URL-encode a silenceId containing reserved characters', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });

      await Prometheus.actions.expireSilence.handler(mockContext, {
        silenceId: 's/1 2',
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        'https://alertmanager.example.com/api/v2/silence/s%2F1%202'
      );
    });
  });

  describe('listAlertGroups action', () => {
    it('should list alert groups with muted and filter params', async () => {
      mockClient.get.mockResolvedValue({ data: [{ labels: { team: 'sre' } }] });

      const result = await Prometheus.actions.listAlertGroups.handler(mockContext, {
        muted: false,
        filter: ['team="sre"'],
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://alertmanager.example.com/api/v2/alerts/groups',
        {
          params: { muted: false, filter: ['team="sre"'] },
          paramsSerializer: { indexes: null },
        }
      );
      expect(result).toEqual({ groups: [{ labels: { team: 'sre' } }] });
    });
  });

  describe('createAlerts action', () => {
    it('should post one or more synthetic alerts', async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      const alerts = [
        {
          labels: { alertname: 'CustomCheckFailed', severity: 'warning' },
          annotations: { summary: 'Custom check failed' },
        },
      ];
      const result = await Prometheus.actions.createAlerts.handler(mockContext, {
        alerts,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://alertmanager.example.com/api/v2/alerts',
        alerts
      );
      expect(result).toEqual({ created: 1 });
    });
  });

  describe('getStatus action', () => {
    it('should fetch instance status', async () => {
      mockClient.get.mockResolvedValue({
        data: { versionInfo: { version: '0.27.0' }, cluster: { status: 'ready' } },
      });

      const result = await Prometheus.actions.getStatus.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith('https://alertmanager.example.com/api/v2/status');
      expect(result).toEqual({ versionInfo: { version: '0.27.0' }, cluster: { status: 'ready' } });
    });
  });

  describe('queryPrometheus action', () => {
    const ctxWithPrometheus = {
      ...mockContext,
      config: {
        baseUrl: 'https://alertmanager.example.com',
        prometheusUrl: 'https://prometheus.example.com',
      },
    } as unknown as ActionContext;

    it('should run an instant query', async () => {
      mockClient.get.mockResolvedValue({
        data: { status: 'success', data: { resultType: 'vector', result: [] } },
      });

      const result = await Prometheus.actions.queryPrometheus.handler(ctxWithPrometheus, {
        query: 'up',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://prometheus.example.com/api/v1/query', {
        params: { query: 'up' },
      });
      expect(result).toEqual({ status: 'success', data: { resultType: 'vector', result: [] } });
    });

    it('should throw a clear error when prometheusUrl is not configured', async () => {
      await expect(
        Prometheus.actions.queryPrometheus.handler(mockContext, { query: 'up' })
      ).rejects.toThrow('Prometheus server URL');
    });

    it('should throw a formatted error using the Prometheus JSON error envelope', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 422,
          data: { status: 'error', errorType: 'bad_data', error: 'parse error' },
        },
      });

      await expect(
        Prometheus.actions.queryPrometheus.handler(ctxWithPrometheus, { query: 'up(' })
      ).rejects.toThrow('Prometheus queryPrometheus failed (status 422) [bad_data]: parse error');
    });
  });

  describe('listPrometheusRules action', () => {
    const ctxWithPrometheus = {
      ...mockContext,
      config: {
        baseUrl: 'https://alertmanager.example.com',
        prometheusUrl: 'https://prometheus.example.com',
      },
    } as unknown as ActionContext;

    it('should send repeated bracketed keys for ruleName/ruleGroup filters', async () => {
      mockClient.get.mockResolvedValue({ data: { groups: [] } });

      await Prometheus.actions.listPrometheusRules.handler(ctxWithPrometheus, {
        type: 'alert',
        ruleName: ['HighRequestLatency', 'DiskSpaceLow'],
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://prometheus.example.com/api/v1/rules', {
        params: { type: 'alert', rule_name: ['HighRequestLatency', 'DiskSpaceLow'] },
        paramsSerializer: { indexes: false },
      });
    });
  });

  describe('queryRangePrometheus action', () => {
    const ctxWithPrometheus = {
      ...mockContext,
      config: {
        baseUrl: 'https://alertmanager.example.com',
        prometheusUrl: 'https://prometheus.example.com',
      },
    } as unknown as ActionContext;

    it('should run a range query with query/start/end/step', async () => {
      mockClient.get.mockResolvedValue({
        data: { status: 'success', data: { resultType: 'matrix', result: [] } },
      });

      const result = await Prometheus.actions.queryRangePrometheus.handler(ctxWithPrometheus, {
        query: 'rate(http_requests_total[5m])',
        start: '2026-01-01T00:00:00Z',
        end: '2026-01-01T01:00:00Z',
        step: '1m',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://prometheus.example.com/api/v1/query_range',
        {
          params: {
            query: 'rate(http_requests_total[5m])',
            start: '2026-01-01T00:00:00Z',
            end: '2026-01-01T01:00:00Z',
            step: '1m',
          },
        }
      );
      expect(result).toEqual({ status: 'success', data: { resultType: 'matrix', result: [] } });
    });

    it('should throw a clear error when prometheusUrl is not configured', async () => {
      await expect(
        Prometheus.actions.queryRangePrometheus.handler(mockContext, {
          query: 'up',
          start: '2026-01-01T00:00:00Z',
          end: '2026-01-01T01:00:00Z',
          step: '1m',
        })
      ).rejects.toThrow('Prometheus server URL');
    });
  });

  describe('listPrometheusTargets action', () => {
    const ctxWithPrometheus = {
      ...mockContext,
      config: {
        baseUrl: 'https://alertmanager.example.com',
        prometheusUrl: 'https://prometheus.example.com',
      },
    } as unknown as ActionContext;

    it('should list targets with no params by default', async () => {
      mockClient.get.mockResolvedValue({ data: { activeTargets: [], droppedTargets: [] } });

      await Prometheus.actions.listPrometheusTargets.handler(ctxWithPrometheus, {});

      expect(mockClient.get).toHaveBeenCalledWith('https://prometheus.example.com/api/v1/targets', {
        params: {},
      });
    });

    it('should pass a state filter when provided', async () => {
      mockClient.get.mockResolvedValue({ data: { activeTargets: [] } });

      await Prometheus.actions.listPrometheusTargets.handler(ctxWithPrometheus, {
        state: 'active',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://prometheus.example.com/api/v1/targets', {
        params: { state: 'active' },
      });
    });
  });

  describe('getPrometheusSeries action', () => {
    const ctxWithPrometheus = {
      ...mockContext,
      config: {
        baseUrl: 'https://alertmanager.example.com',
        prometheusUrl: 'https://prometheus.example.com',
      },
    } as unknown as ActionContext;

    it('should send repeated match[] keys and optional start/end', async () => {
      mockClient.get.mockResolvedValue({ data: [{ __name__: 'up', job: 'node' }] });

      const result = await Prometheus.actions.getPrometheusSeries.handler(ctxWithPrometheus, {
        match: ['up{job="node"}'],
        start: '2026-01-01T00:00:00Z',
        end: '2026-01-01T01:00:00Z',
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://prometheus.example.com/api/v1/series', {
        params: {
          match: ['up{job="node"}'],
          start: '2026-01-01T00:00:00Z',
          end: '2026-01-01T01:00:00Z',
        },
        paramsSerializer: { indexes: false },
      });
      expect(result).toEqual([{ __name__: 'up', job: 'node' }]);
    });
  });

  describe('listPrometheusLabelValues action', () => {
    const ctxWithPrometheus = {
      ...mockContext,
      config: {
        baseUrl: 'https://alertmanager.example.com',
        prometheusUrl: 'https://prometheus.example.com',
      },
    } as unknown as ActionContext;

    it('should URL-encode the label name and pass optional match/start/end', async () => {
      mockClient.get.mockResolvedValue({ data: ['node-1', 'node-2'] });

      const result = await Prometheus.actions.listPrometheusLabelValues.handler(ctxWithPrometheus, {
        label: 'instance/name',
        match: ['up{job="node"}'],
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://prometheus.example.com/api/v1/label/instance%2Fname/values',
        { params: { match: ['up{job="node"}'] }, paramsSerializer: { indexes: false } }
      );
      expect(result).toEqual(['node-1', 'node-2']);
    });
  });

  describe('test handler', () => {
    it('should succeed when status can be read', async () => {
      mockClient.get.mockResolvedValue({
        data: { versionInfo: { version: '0.27.0' }, cluster: { status: 'ready' } },
      });

      const result = await Prometheus.test.handler(mockContext);

      expect(result.message).toContain('0.27.0');
      expect(result.message).toContain('ready');
    });

    it('should throw a formatted error on failure', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 401, data: 'unauthorized' },
      });

      if (!Prometheus.test) throw new Error('Test handler not defined');
      await expect(Prometheus.test.handler(mockContext)).rejects.toThrow(
        'Alertmanager test failed (status 401): unauthorized'
      );
    });
  });
});
