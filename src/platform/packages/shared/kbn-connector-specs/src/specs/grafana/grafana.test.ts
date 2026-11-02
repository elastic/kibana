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
import { Grafana } from './grafana';

describe('Grafana', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { baseUrl: 'https://acme.grafana.net' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(Grafana).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.grafana');
    expect(spec).toBe(Grafana);
    expect(spec?.actions.getAlerts).toBeDefined();
    expect(spec?.actions.getAlerts.isTool).toBe(true);
  });

  it('should have correct metadata', () => {
    expect(Grafana.metadata.id).toBe('.grafana');
    expect(Grafana.metadata.displayName).toBe('Grafana');
    expect(Grafana.metadata.minimumLicense).toBe('enterprise');
  });

  it('should support bearer auth', () => {
    const types = (Grafana.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toContain('bearer');
  });

  describe('getAlerts action', () => {
    it('should fetch alerts with no params by default', async () => {
      mockClient.get.mockResolvedValue({ data: [{ labels: { alertname: 'HighCPU' } }] });

      const result = await Grafana.actions.getAlerts.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/alertmanager/grafana/api/v2/alerts',
        { params: {}, headers: {} }
      );
      expect(result).toEqual({ alerts: [{ labels: { alertname: 'HighCPU' } }] });
    });

    it('should pass active, silenced, inhibited params', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      await Grafana.actions.getAlerts.handler(mockContext, {
        active: true,
        silenced: false,
        inhibited: false,
      });

      expect(mockClient.get).toHaveBeenCalledWith(expect.any(String), {
        params: { active: true, silenced: false, inhibited: false },
        headers: {},
      });
    });

    it('should include X-Grafana-Org-Id header when orgId configured', async () => {
      mockClient.get.mockResolvedValue({ data: [] });
      const ctxWithOrg = {
        ...mockContext,
        config: { baseUrl: 'https://acme.grafana.net', orgId: '2' },
      } as unknown as ActionContext;

      await Grafana.actions.getAlerts.handler(ctxWithOrg, {});

      expect(mockClient.get).toHaveBeenCalledWith(expect.any(String), {
        params: {},
        headers: { 'X-Grafana-Org-Id': '2' },
      });
    });

    it('should throw a formatted error on failure', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 401, data: { message: 'unauthorized' } },
      });

      await expect(Grafana.actions.getAlerts.handler(mockContext, {})).rejects.toThrow(
        'Grafana getAlerts failed (status 401): unauthorized'
      );
    });
  });

  describe('listRules action', () => {
    it('should list alert rules', async () => {
      mockClient.get.mockResolvedValue({ data: [{ uid: 'r1', title: 'High CPU' }] });

      const result = await Grafana.actions.listRules.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/v1/provisioning/alert-rules',
        { headers: {} }
      );
      expect(result).toEqual({ rules: [{ uid: 'r1', title: 'High CPU' }] });
    });
  });

  describe('getAlertRule action', () => {
    it('should fetch a rule by uid', async () => {
      mockClient.get.mockResolvedValue({ data: { uid: 'r1', condition: 'A' } });

      const result = await Grafana.actions.getAlertRule.handler(mockContext, { uid: 'r1' });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/v1/provisioning/alert-rules/r1',
        { headers: {} }
      );
      expect(result).toEqual({ uid: 'r1', condition: 'A' });
    });

    it('should URL-encode a uid containing reserved characters', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await Grafana.actions.getAlertRule.handler(mockContext, { uid: 'r/1#2' });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/v1/provisioning/alert-rules/r%2F1%232',
        { headers: {} }
      );
    });
  });

  describe('listSilences / getSilence actions', () => {
    it('should list silences', async () => {
      mockClient.get.mockResolvedValue({ data: [{ id: 's1' }] });

      const result = await Grafana.actions.listSilences.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/alertmanager/grafana/api/v2/silences',
        { headers: {} }
      );
      expect(result).toEqual({ silences: [{ id: 's1' }] });
    });

    it('should get a single silence', async () => {
      mockClient.get.mockResolvedValue({ data: { id: 's1', status: { state: 'active' } } });

      const result = await Grafana.actions.getSilence.handler(mockContext, { silenceId: 's1' });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/alertmanager/grafana/api/v2/silence/s1',
        { headers: {} }
      );
      expect(result).toEqual({ id: 's1', status: { state: 'active' } });
    });

    it('should URL-encode a silenceId containing reserved characters', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await Grafana.actions.getSilence.handler(mockContext, { silenceId: 's/1 2' });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/alertmanager/grafana/api/v2/silence/s%2F1%202',
        { headers: {} }
      );
    });
  });

  describe('createSilence action', () => {
    it('should create a silence with required fields', async () => {
      mockClient.post.mockResolvedValue({ data: { silenceID: 's1' } });

      const result = await Grafana.actions.createSilence.handler(mockContext, {
        matchers: [{ name: 'alertname', value: 'HighCPU' }],
        startsAt: '2026-01-01T00:00:00Z',
        endsAt: '2026-01-01T02:00:00Z',
        comment: 'Maintenance window',
        createdBy: 'workflow-bot',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/alertmanager/grafana/api/v2/silences',
        {
          matchers: [{ name: 'alertname', value: 'HighCPU' }],
          startsAt: '2026-01-01T00:00:00Z',
          endsAt: '2026-01-01T02:00:00Z',
          comment: 'Maintenance window',
          createdBy: 'workflow-bot',
        },
        { headers: {} }
      );
      expect(result).toEqual({ silenceID: 's1' });
    });
  });

  describe('deleteSilence action', () => {
    it('should expire a silence', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });

      const result = await Grafana.actions.deleteSilence.handler(mockContext, { silenceId: 's1' });

      expect(mockClient.delete).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/alertmanager/grafana/api/v2/silence/s1',
        { headers: {} }
      );
      expect(result).toEqual({ deleted: true, silenceId: 's1' });
    });

    it('should URL-encode a silenceId containing reserved characters', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });

      await Grafana.actions.deleteSilence.handler(mockContext, { silenceId: 's/1 2' });

      expect(mockClient.delete).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/alertmanager/grafana/api/v2/silence/s%2F1%202',
        { headers: {} }
      );
    });
  });

  describe('createAnnotation action', () => {
    it('should create a point-in-time annotation', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 1, message: 'Annotation added' } });

      const result = await Grafana.actions.createAnnotation.handler(mockContext, {
        text: 'Deploy v1.2.3',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/annotations',
        { text: 'Deploy v1.2.3' },
        { headers: {} }
      );
      expect(result).toEqual({ id: 1, message: 'Annotation added' });
    });

    it('should create a range annotation scoped to a dashboard/panel', async () => {
      mockClient.post.mockResolvedValue({ data: { id: 2 } });

      await Grafana.actions.createAnnotation.handler(mockContext, {
        text: 'Incident window',
        dashboardUID: 'd1',
        panelId: 4,
        time: 1000,
        timeEnd: 2000,
        tags: ['incident'],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/annotations',
        {
          text: 'Incident window',
          dashboardUID: 'd1',
          panelId: 4,
          time: 1000,
          timeEnd: 2000,
          tags: ['incident'],
        },
        { headers: {} }
      );
    });
  });

  describe('listAnnotations action', () => {
    it('should list annotations with no filters by default', async () => {
      mockClient.get.mockResolvedValue({ data: [{ id: 1, text: 'Deploy v1.2.3' }] });

      const result = await Grafana.actions.listAnnotations.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith('https://acme.grafana.net/api/annotations', {
        params: {},
        paramsSerializer: { indexes: null },
        headers: {},
      });
      expect(result).toEqual({ annotations: [{ id: 1, text: 'Deploy v1.2.3' }] });
    });

    it('should filter by dashboardUID, tags, and time range', async () => {
      mockClient.get.mockResolvedValue({ data: [{ id: 2, text: 'Incident window' }] });

      await Grafana.actions.listAnnotations.handler(mockContext, {
        dashboardUID: 'd1',
        tags: ['incident'],
        from: 1000,
        to: 2000,
        limit: 50,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://acme.grafana.net/api/annotations', {
        params: { dashboardUID: 'd1', tags: ['incident'], from: 1000, to: 2000, limit: 50 },
        paramsSerializer: { indexes: null },
        headers: {},
      });
    });
  });

  describe('updateAnnotation action', () => {
    it('should patch only provided fields', async () => {
      mockClient.patch.mockResolvedValue({ data: { id: 1, timeEnd: 3000 } });

      await Grafana.actions.updateAnnotation.handler(mockContext, {
        annotationId: 1,
        timeEnd: 3000,
      });

      expect(mockClient.patch).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/annotations/1',
        { timeEnd: 3000 },
        { headers: {} }
      );
    });
  });

  describe('deleteAnnotation action', () => {
    it('should delete an annotation', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });

      const result = await Grafana.actions.deleteAnnotation.handler(mockContext, {
        annotationId: 1,
      });

      expect(mockClient.delete).toHaveBeenCalledWith('https://acme.grafana.net/api/annotations/1', {
        headers: {},
      });
      expect(result).toEqual({ deleted: true, annotationId: 1 });
    });
  });

  describe('searchDashboards action', () => {
    it('should search with query and tag', async () => {
      mockClient.get.mockResolvedValue({ data: [{ uid: 'd1', title: 'Prod overview' }] });

      const result = await Grafana.actions.searchDashboards.handler(mockContext, {
        query: 'prod',
        tag: ['prod'],
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://acme.grafana.net/api/search', {
        params: { query: 'prod', tag: ['prod'] },
        paramsSerializer: { indexes: null },
        headers: {},
      });
      expect(result).toEqual({ results: [{ uid: 'd1', title: 'Prod overview' }] });
    });
  });

  describe('getDashboard action', () => {
    it('should fetch a dashboard by uid', async () => {
      mockClient.get.mockResolvedValue({ data: { dashboard: { uid: 'd1' }, meta: {} } });

      const result = await Grafana.actions.getDashboard.handler(mockContext, { uid: 'd1' });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/dashboards/uid/d1',
        { headers: {} }
      );
      expect(result).toEqual({ dashboard: { uid: 'd1' }, meta: {} });
    });

    it('should URL-encode a uid containing reserved characters', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await Grafana.actions.getDashboard.handler(mockContext, { uid: 'd/1#2' });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/dashboards/uid/d%2F1%232',
        { headers: {} }
      );
    });
  });

  describe('listContactPoints action', () => {
    it('should list contact points', async () => {
      mockClient.get.mockResolvedValue({ data: [{ uid: 'c1', name: 'oncall-slack' }] });

      const result = await Grafana.actions.listContactPoints.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/v1/provisioning/contact-points',
        { params: {}, headers: {} }
      );
      expect(result).toEqual({ contactPoints: [{ uid: 'c1', name: 'oncall-slack' }] });
    });
  });

  describe('listMuteTimings action', () => {
    it('should list mute timings', async () => {
      mockClient.get.mockResolvedValue({ data: [{ name: 'weekends' }] });

      const result = await Grafana.actions.listMuteTimings.handler(mockContext, {});

      expect(result).toEqual({ muteTimings: [{ name: 'weekends' }] });
    });
  });

  describe('getNotificationPolicyTree action', () => {
    it('should fetch the policy tree', async () => {
      mockClient.get.mockResolvedValue({ data: { receiver: 'default' } });

      const result = await Grafana.actions.getNotificationPolicyTree.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://acme.grafana.net/api/v1/provisioning/policies',
        { headers: {} }
      );
      expect(result).toEqual({ receiver: 'default' });
    });
  });

  describe('test handler', () => {
    it('should succeed when rules can be listed', async () => {
      mockClient.get.mockResolvedValue({ data: [{ uid: 'r1' }, { uid: 'r2' }] });

      const result = await Grafana.test.handler(mockContext);

      expect(result.message).toContain('2');
    });

    it('should throw a formatted error on failure', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 403, data: { message: 'forbidden' } },
      });

      if (!Grafana.test) throw new Error('Test handler not defined');
      await expect(Grafana.test.handler(mockContext)).rejects.toThrow(
        'Grafana test failed (status 403): forbidden'
      );
    });
  });
});
