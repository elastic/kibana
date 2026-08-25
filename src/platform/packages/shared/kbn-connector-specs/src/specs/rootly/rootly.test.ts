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
import { Rootly } from './rootly';
import { RootlyCreateIncidentInputSchema, RootlyAddIncidentSubscribersInputSchema } from './types';

describe('Rootly', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const JSON_API_HEADERS = {
    'Content-Type': 'application/vnd.api+json',
    Accept: 'application/vnd.api+json',
  };

  // All incident-returning endpoints request sideloaded services/groups so the response can be
  // resolved to friendly { id, name } summaries instead of bare relationship refs.
  const INCLUDE_SERVICES_GROUPS = {
    params: { include: 'services,groups' },
    headers: JSON_API_HEADERS,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(Rootly).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.rootly');
    expect(spec).toBe(Rootly);
    expect(spec?.actions.createIncident).toBeDefined();
    expect(spec?.actions.createIncident.isTool).toBe(true);
  });

  it('should have correct metadata', () => {
    expect(Rootly.metadata.id).toBe('.rootly');
    expect(Rootly.metadata.displayName).toBe('Rootly');
    expect(Rootly.metadata.minimumLicense).toBe('enterprise');
  });

  it('should support bearer auth', () => {
    const types = (Rootly.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toContain('bearer');
  });

  describe('createIncident action', () => {
    it('should create an incident with required and optional fields', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          data: {
            id: 'inc1',
            type: 'incidents',
            attributes: { title: 'DB down', status: 'started' },
          },
        },
      });

      const result = await Rootly.actions.createIncident.handler(mockContext, {
        title: 'DB down',
        severityId: 'sev1',
        serviceIds: ['svc1'],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents',
        {
          data: {
            type: 'incidents',
            attributes: { title: 'DB down', severity_id: 'sev1', service_ids: ['svc1'] },
          },
        },
        INCLUDE_SERVICES_GROUPS
      );
      expect(result).toEqual({ id: 'inc1', title: 'DB down', status: 'started' });
    });

    it('should throw a formatted error on failure', async () => {
      mockClient.post.mockRejectedValue({
        response: { status: 422, data: { errors: [{ detail: 'title is required' }] } },
      });

      await expect(
        Rootly.actions.createIncident.handler(mockContext, { title: 'x' })
      ).rejects.toThrow('Rootly createIncident failed (status 422): title is required');
    });

    it('should pass labels through as a key-value object, not a string', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { id: 'inc1', type: 'incidents', attributes: { title: 'DB down' } } },
      });

      await Rootly.actions.createIncident.handler(mockContext, {
        title: 'DB down',
        labels: { platform: 'osx', version: '1.29' },
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents',
        {
          data: {
            type: 'incidents',
            attributes: { title: 'DB down', labels: { platform: 'osx', version: '1.29' } },
          },
        },
        INCLUDE_SERVICES_GROUPS
      );
    });

    it('should reject a comma-separated string for labels (Rootly expects an object)', () => {
      const result = RootlyCreateIncidentInputSchema.safeParse({
        title: 'DB down',
        labels: 'platform:osx,version:1.29',
      });
      expect(result.success).toBe(false);
    });

    it('should reject more than 50 label entries', () => {
      const labels = Object.fromEntries(
        Array.from({ length: 51 }, (_, i) => [`key${i}`, `value${i}`])
      );
      const result = RootlyCreateIncidentInputSchema.safeParse({ title: 'DB down', labels });
      expect(result.success).toBe(false);
    });

    it('should reject more than 50 serviceIds/groupIds', () => {
      const ids = Array.from({ length: 51 }, (_, i) => `id${i}`);
      expect(
        RootlyCreateIncidentInputSchema.safeParse({ title: 'DB down', serviceIds: ids }).success
      ).toBe(false);
      expect(
        RootlyCreateIncidentInputSchema.safeParse({ title: 'DB down', groupIds: ids }).success
      ).toBe(false);
    });
  });

  describe('getIncident action', () => {
    it('should fetch a single incident', async () => {
      mockClient.get.mockResolvedValue({
        data: { data: { id: 'inc1', attributes: { title: 'DB down' } } },
      });

      const result = await Rootly.actions.getIncident.handler(mockContext, { incidentId: 'inc1' });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents/inc1',
        INCLUDE_SERVICES_GROUPS
      );
      expect(result).toEqual({ id: 'inc1', title: 'DB down' });
    });

    it('should resolve services/groups relationships to { id, name } using the included array', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          data: {
            id: 'inc1',
            attributes: { title: 'DB down' },
            relationships: {
              services: { data: [{ id: 'svc1', type: 'services' }] },
              groups: { data: [{ id: 'team1', type: 'groups' }] },
            },
          },
          included: [
            { id: 'svc1', type: 'services', attributes: { name: 'Checkout' } },
            { id: 'team1', type: 'groups', attributes: { name: 'Payments' } },
          ],
        },
      });

      const result = await Rootly.actions.getIncident.handler(mockContext, { incidentId: 'inc1' });

      expect(result).toEqual({
        id: 'inc1',
        title: 'DB down',
        services: [{ id: 'svc1', name: 'Checkout' }],
        groups: [{ id: 'team1', name: 'Payments' }],
      });
    });
  });

  describe('listIncidents action', () => {
    it('should list with filters', async () => {
      mockClient.get.mockResolvedValue({
        data: { data: [{ id: 'inc1', attributes: {} }], meta: { total_count: 1 } },
      });

      const result = await Rootly.actions.listIncidents.handler(mockContext, {
        status: 'started',
        severityId: 'sev1',
        pageSize: 20,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.rootly.com/v1/incidents', {
        params: {
          'filter[status]': 'started',
          'filter[severity_id]': 'sev1',
          'page[size]': 20,
          include: 'services,groups',
        },
        headers: JSON_API_HEADERS,
      });
      expect(result).toEqual({ items: [{ id: 'inc1' }], meta: { total_count: 1 } });
    });
  });

  describe('updateIncident action', () => {
    it('should patch provided fields', async () => {
      mockClient.put.mockResolvedValue({
        data: { data: { id: 'inc1', attributes: { title: 'Updated' } } },
      });

      await Rootly.actions.updateIncident.handler(mockContext, {
        incidentId: 'inc1',
        title: 'Updated',
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents/inc1',
        { data: { type: 'incidents', attributes: { title: 'Updated' } } },
        INCLUDE_SERVICES_GROUPS
      );
    });

    it('should pass labels through as a key-value object', async () => {
      mockClient.put.mockResolvedValue({
        data: { data: { id: 'inc1', attributes: { title: 'Updated' } } },
      });

      await Rootly.actions.updateIncident.handler(mockContext, {
        incidentId: 'inc1',
        labels: { platform: 'osx' },
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents/inc1',
        { data: { type: 'incidents', attributes: { labels: { platform: 'osx' } } } },
        INCLUDE_SERVICES_GROUPS
      );
    });
  });

  describe('lifecycle actions', () => {
    it('triageIncident should PUT in_triage with no attributes', async () => {
      mockClient.put.mockResolvedValue({
        data: { data: { id: 'inc1', attributes: { status: 'in_triage' } } },
      });

      await Rootly.actions.triageIncident.handler(mockContext, { incidentId: 'inc1' });

      expect(mockClient.put).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents/inc1/in_triage',
        { data: { type: 'incidents' } },
        INCLUDE_SERVICES_GROUPS
      );
    });

    it('mitigateIncident should PUT mitigate with optional message', async () => {
      mockClient.put.mockResolvedValue({
        data: { data: { id: 'inc1', attributes: { status: 'mitigated' } } },
      });

      await Rootly.actions.mitigateIncident.handler(mockContext, {
        incidentId: 'inc1',
        message: 'Rolled back deploy',
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents/inc1/mitigate',
        { data: { type: 'incidents', attributes: { mitigation_message: 'Rolled back deploy' } } },
        INCLUDE_SERVICES_GROUPS
      );
    });

    it('resolveIncident should PUT resolve', async () => {
      mockClient.put.mockResolvedValue({
        data: { data: { id: 'inc1', attributes: { status: 'resolved' } } },
      });

      await Rootly.actions.resolveIncident.handler(mockContext, { incidentId: 'inc1' });

      expect(mockClient.put).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents/inc1/resolve',
        { data: { type: 'incidents', attributes: {} } },
        INCLUDE_SERVICES_GROUPS
      );
    });

    it('cancelIncident should PUT cancel', async () => {
      mockClient.put.mockResolvedValue({
        data: { data: { id: 'inc1', attributes: { status: 'cancelled' } } },
      });

      await Rootly.actions.cancelIncident.handler(mockContext, {
        incidentId: 'inc1',
        message: 'False alarm',
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents/inc1/cancel',
        { data: { type: 'incidents', attributes: { cancellation_message: 'False alarm' } } },
        INCLUDE_SERVICES_GROUPS
      );
    });
  });

  describe('assignIncidentUser action', () => {
    it('should assign a user to an incident role', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { id: 'inc1', attributes: {} } } });

      await Rootly.actions.assignIncidentUser.handler(mockContext, {
        incidentId: 'inc1',
        userId: 'u1',
        incidentRoleId: 'role1',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents/inc1/assign_role_to_user',
        { data: { type: 'incidents', attributes: { user_id: 'u1', incident_role_id: 'role1' } } },
        INCLUDE_SERVICES_GROUPS
      );
    });
  });

  describe('addIncidentSubscribers action', () => {
    it('should subscribe users', async () => {
      mockClient.post.mockResolvedValue({ data: { data: { id: 'inc1', attributes: {} } } });

      await Rootly.actions.addIncidentSubscribers.handler(mockContext, {
        incidentId: 'inc1',
        userIds: ['u1', 'u2'],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents/inc1/add_subscribers',
        { data: { type: 'incidents', attributes: { user_ids: ['u1', 'u2'] } } },
        INCLUDE_SERVICES_GROUPS
      );
    });

    it('should reject more than 50 userIds', () => {
      const userIds = Array.from({ length: 51 }, (_, i) => `u${i}`);
      const result = RootlyAddIncidentSubscribersInputSchema.safeParse({
        incidentId: 'inc1',
        userIds,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createActionItem / listActionItems actions', () => {
    it('should create an action item', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { id: 'ai1', attributes: { summary: 'Patch server' } } },
      });

      const result = await Rootly.actions.createActionItem.handler(mockContext, {
        incidentId: 'inc1',
        summary: 'Patch server',
        priority: 'high',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents/inc1/action_items',
        {
          data: {
            type: 'incident_action_items',
            attributes: { summary: 'Patch server', priority: 'high' },
          },
        },
        { headers: JSON_API_HEADERS }
      );
      expect(result).toEqual({ id: 'ai1', summary: 'Patch server' });
    });

    it('should list action items scoped to an incident', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [{ id: 'ai1', attributes: {} }] } });

      await Rootly.actions.listActionItems.handler(mockContext, {
        incidentId: 'inc1',
        status: 'open',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents/inc1/action_items',
        { params: { 'filter[status]': 'open' }, headers: JSON_API_HEADERS }
      );
    });

    it('should list action items org-wide when incidentId omitted', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [] } });

      await Rootly.actions.listActionItems.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith('https://api.rootly.com/v1/action_items', {
        params: {},
        headers: JSON_API_HEADERS,
      });
    });
  });

  describe('createTimelineEvent action', () => {
    it('should post an event to the timeline', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { id: 'ev1', attributes: { event: 'Deployed fix' } } },
      });

      await Rootly.actions.createTimelineEvent.handler(mockContext, {
        incidentId: 'inc1',
        event: 'Deployed fix',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/incidents/inc1/events',
        { data: { type: 'incident_events', attributes: { event: 'Deployed fix' } } },
        { headers: JSON_API_HEADERS }
      );
    });
  });

  describe('listSeverities / listServices / listTeams actions', () => {
    it('should list severities', async () => {
      mockClient.get.mockResolvedValue({
        data: { data: [{ id: 'sev1', attributes: { name: 'SEV1' } }] },
      });

      const result = await Rootly.actions.listSeverities.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith('https://api.rootly.com/v1/severities', {
        headers: JSON_API_HEADERS,
      });
      expect(result).toEqual({ items: [{ id: 'sev1', name: 'SEV1' }], meta: undefined });
    });

    it('should list services with a name filter', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [] } });

      await Rootly.actions.listServices.handler(mockContext, { name: 'checkout' });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.rootly.com/v1/services', {
        params: { 'filter[name]': 'checkout' },
        headers: JSON_API_HEADERS,
      });
    });

    it('should list teams', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [] } });

      await Rootly.actions.listTeams.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith('https://api.rootly.com/v1/teams', {
        params: {},
        headers: JSON_API_HEADERS,
      });
    });
  });

  describe('alert actions', () => {
    it('should list alerts', async () => {
      mockClient.get.mockResolvedValue({
        data: { data: [{ id: 'al1', attributes: { status: 'triggered' } }] },
      });

      const result = await Rootly.actions.listAlerts.handler(mockContext, { status: 'triggered' });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.rootly.com/v1/alerts', {
        params: { 'filter[status]': 'triggered' },
        headers: JSON_API_HEADERS,
      });
      expect(result).toEqual({ items: [{ id: 'al1', status: 'triggered' }], meta: undefined });
    });

    it('should get a single alert', async () => {
      mockClient.get.mockResolvedValue({ data: { data: { id: 'al1', attributes: {} } } });

      await Rootly.actions.getAlert.handler(mockContext, { alertId: 'al1' });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.rootly.com/v1/alerts/al1', {
        headers: JSON_API_HEADERS,
      });
    });

    it('should acknowledge an alert', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { id: 'al1', attributes: { status: 'acknowledged' } } },
      });

      await Rootly.actions.acknowledgeAlert.handler(mockContext, { alertId: 'al1' });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/alerts/al1/acknowledge',
        {},
        { headers: JSON_API_HEADERS }
      );
    });

    it('should resolve an alert with optional cascade', async () => {
      mockClient.post.mockResolvedValue({
        data: { data: { id: 'al1', attributes: { status: 'resolved' } } },
      });

      await Rootly.actions.resolveAlert.handler(mockContext, {
        alertId: 'al1',
        resolutionMessage: 'Condition cleared',
        resolveRelatedIncidents: true,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.rootly.com/v1/alerts/al1/resolve',
        {
          data: {
            type: 'alerts',
            attributes: {
              resolution_message: 'Condition cleared',
              resolve_related_incidents: true,
            },
          },
        },
        { headers: JSON_API_HEADERS }
      );
    });
  });

  describe('test handler', () => {
    it('should succeed when severities can be listed', async () => {
      mockClient.get.mockResolvedValue({ data: { data: [{ id: 'sev1' }, { id: 'sev2' }] } });

      const result = await Rootly.test.handler(mockContext);

      expect(result.message).toContain('2');
    });

    it('should throw a formatted error on failure', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 401, data: { errors: [{ title: 'Unauthorized' }] } },
      });

      if (!Rootly.test) throw new Error('Test handler not defined');
      await expect(Rootly.test.handler(mockContext)).rejects.toThrow(
        'Rootly test failed (status 401): Unauthorized'
      );
    });
  });
});
