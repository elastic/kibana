/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { PagerdutyConnector } from './pagerduty';

const mockCallTool = jest.fn();
const mockListTools = jest.fn();
const mockClientPost = jest.fn();
const mockClientPut = jest.fn();
const mockClientGet = jest.fn();

jest.mock('../../lib/mcp/with_mcp_client', () => ({
  withMcpClient: jest.fn(async (_ctx: unknown, fn: (mcp: unknown) => Promise<unknown>) => {
    return fn({ callTool: mockCallTool, listTools: mockListTools });
  }),
}));

type ActionName = keyof typeof PagerdutyConnector.actions;

const parse = (action: ActionName, raw: Record<string, unknown>) =>
  PagerdutyConnector.actions[action].input.parse(raw);

const TOOL_ACTIONS: Array<{ action: ActionName; tool: string; scope: 'read' | 'destroy' }> = [
  { action: 'browseIncidents', tool: 'browse_incidents', scope: 'read' },
  { action: 'browseServices', tool: 'browse_services', scope: 'read' },
  { action: 'browseSchedules', tool: 'browse_schedules', scope: 'read' },
  { action: 'browseTeams', tool: 'browse_teams', scope: 'read' },
  { action: 'browseUsers', tool: 'browse_users', scope: 'read' },
  { action: 'browseEscalationPolicies', tool: 'browse_escalation_policies', scope: 'read' },
  { action: 'browseEventOrchestrations', tool: 'browse_event_orchestrations', scope: 'read' },
  { action: 'browseAlertGrouping', tool: 'browse_alert_grouping', scope: 'read' },
  { action: 'browseChangeEvents', tool: 'browse_change_events', scope: 'read' },
  { action: 'browseStatusPages', tool: 'browse_status_pages', scope: 'read' },
  { action: 'browseActivity', tool: 'browse_activity', scope: 'read' },
  { action: 'manageIncidents', tool: 'manage_incidents', scope: 'destroy' },
  { action: 'manageServices', tool: 'manage_services', scope: 'destroy' },
  { action: 'manageSchedules', tool: 'manage_schedules', scope: 'destroy' },
  { action: 'manageTeams', tool: 'manage_teams', scope: 'destroy' },
  { action: 'manageEventOrchestrations', tool: 'manage_event_orchestrations', scope: 'destroy' },
  { action: 'manageAlertGrouping', tool: 'manage_alert_grouping', scope: 'destroy' },
  { action: 'manageStatusPages', tool: 'manage_status_pages', scope: 'destroy' },
];

const REST_ACTIONS = [
  'triggerIncident',
  'acknowledgeIncident',
  'resolveIncident',
  'updateIncident',
  'listServices',
  'addResponders',
  'runResponsePlay',
];

describe('PagerdutyConnector', () => {
  const mockContext = {
    client: {
      post: mockClientPost,
      put: mockClientPut,
      get: mockClientGet,
    },
    log: {},
    config: { serverUrl: 'https://mcp.pagerduty.com/mcp' },
  } as unknown as ActionContext;

  const mockJson = { ok: true };
  const mockContent = [{ type: 'text', text: JSON.stringify(mockJson) }];
  const mockIncident = { id: 'Q1A2B3C4D5E6F7', status: 'triggered', title: 'Prod DB down' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallTool.mockResolvedValue({ content: mockContent });
    mockListTools.mockResolvedValue({
      tools: [{ name: 'browse_incidents' }, { name: 'manage_incidents' }],
    });
    mockClientPost.mockResolvedValue({ data: { incident: mockIncident } });
    mockClientPut.mockResolvedValue({
      data: { incident: { ...mockIncident, status: 'acknowledged' } },
    });
    mockClientGet.mockResolvedValue({ data: { services: [{ id: 'PSVC01', name: 'Prod DB' }] } });
  });

  describe('action surface', () => {
    it('exposes one action per MCP tool plus the REST actions, listTools, and callTool', () => {
      expect(Object.keys(PagerdutyConnector.actions).sort()).toEqual(
        [
          ...TOOL_ACTIONS.map(({ action }) => action),
          ...REST_ACTIONS,
          'listTools',
          'callTool',
        ].sort()
      );
    });

    it.each(TOOL_ACTIONS)(
      '$action calls $tool with scope $scope',
      async ({ action, tool, scope }) => {
        const spec = PagerdutyConnector.actions[action];
        expect(spec.scope).toBe(scope);

        const request = { action: 'get' };
        await spec.handler(mockContext, { request } as never);

        expect(mockCallTool).toHaveBeenCalledWith({ name: tool, arguments: { request } });
      }
    );
  });

  describe('browse actions', () => {
    it('returns parsed JSON from the tool result', async () => {
      const input = parse('browseUsers', { request: { action: 'get' } });
      const result = await PagerdutyConnector.actions.browseUsers.handler(
        mockContext,
        input as never
      );

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'browse_users',
        arguments: { request: { action: 'get' } },
      });
      expect(result).toEqual(mockJson);
    });

    it('passes incident list filters through unchanged', async () => {
      const request = {
        action: 'list',
        request_scope: 'assigned',
        statuses: ['triggered', 'acknowledged'],
        urgencies: ['high'],
        since: '2026-09-01T00:00:00Z',
        service_ids: ['PSVC01'],
        limit: 25,
      };
      const input = parse('browseIncidents', { request });
      await PagerdutyConnector.actions.browseIncidents.handler(mockContext, input as never);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'browse_incidents',
        arguments: { request },
      });
    });

    it('requires context_type for the incident context action', () => {
      expect(() =>
        parse('browseIncidents', { request: { action: 'context', incident_id: 'Q1' } })
      ).toThrow();
      expect(() =>
        parse('browseIncidents', {
          request: { action: 'context', incident_id: 'Q1', context_type: 'past' },
        })
      ).not.toThrow();
    });

    it('requires since and until when listing schedule overrides', () => {
      expect(() =>
        parse('browseSchedules', { request: { action: 'list_overrides', schedule_id: 'PSCH01' } })
      ).toThrow();
      expect(() =>
        parse('browseSchedules', {
          request: {
            action: 'list_overrides',
            schedule_id: 'PSCH01',
            since: '2026-09-01T00:00:00Z',
            until: '2026-09-08T00:00:00Z',
          },
        })
      ).not.toThrow();
    });

    it('rejects an unknown action and an out-of-range limit', () => {
      expect(() => parse('browseServices', { request: { action: 'delete' } })).toThrow();
      expect(() => parse('browseServices', { request: { action: 'list', limit: 500 } })).toThrow();
    });

    it('rejects a request without an action', () => {
      expect(() => parse('browseTeams', { request: {} })).toThrow();
      expect(() => parse('browseTeams', {})).toThrow();
    });
  });

  describe('manage actions', () => {
    it('creates an incident with the nested incident payload', async () => {
      const request = {
        action: 'create',
        incident: {
          title: 'Prod DB down',
          service: { id: 'PIJ90N7' },
          urgency: 'high',
          assignments: [{ assignee: { id: 'PUSER01' } }],
        },
      };
      const input = parse('manageIncidents', { request });
      const result = await PagerdutyConnector.actions.manageIncidents.handler(
        mockContext,
        input as never
      );

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'manage_incidents',
        arguments: { request },
      });
      expect(result).toEqual(mockJson);
    });

    it('requires incident.title and incident.service on create', () => {
      expect(() =>
        parse('manageIncidents', { request: { action: 'create', incident: { title: 'x' } } })
      ).toThrow();
    });

    it('acknowledges incidents through update', () => {
      expect(() =>
        parse('manageIncidents', {
          request: {
            action: 'update',
            manage_request: { incident_ids: ['Q1', 'Q2'], status: 'acknowledged' },
          },
        })
      ).not.toThrow();
    });

    it('rejects triggered as an update status', () => {
      expect(() =>
        parse('manageIncidents', {
          request: {
            action: 'update',
            manage_request: { incident_ids: ['Q1'], status: 'triggered' },
          },
        })
      ).toThrow();
    });

    it('requires at least one responder target', () => {
      expect(() =>
        parse('manageIncidents', {
          request: {
            action: 'add_responders',
            incident_id: 'Q1',
            request: { message: 'Need help', responder_request_targets: [] },
          },
        })
      ).toThrow();
      expect(() =>
        parse('manageIncidents', {
          request: {
            action: 'add_responders',
            incident_id: 'Q1',
            request: {
              message: 'Need help',
              responder_request_targets: [
                { responder_request_target: { id: 'PUSER01', type: 'user_reference' } },
              ],
            },
          },
        })
      ).not.toThrow();
    });

    it('distinguishes legacy and shift_based schedule creation', () => {
      expect(() =>
        parse('manageSchedules', {
          request: {
            action: 'create',
            schedule_data: { kind: 'shift_based', name: 'Primary', time_zone: 'UTC' },
          },
        })
      ).not.toThrow();
      expect(() =>
        parse('manageSchedules', {
          request: {
            action: 'create',
            schedule_data: { kind: 'legacy', schedule: { name: 'Primary', time_zone: 'UTC' } },
          },
        })
      ).toThrow();
    });

    it('requires a recurrence and assignment strategy for rotation events', () => {
      expect(() =>
        parse('manageSchedules', {
          request: {
            action: 'create_rotation_event',
            schedule_id: 'PSCH01',
            rotation_id: 'R1',
            event_data: {
              name: 'Weekdays',
              start_time: { date_time: '2026-09-04T09:00:00Z', time_zone: 'UTC' },
              end_time: { date_time: '2026-09-04T17:00:00Z', time_zone: 'UTC' },
              effective_since: '2026-09-04T00:00:00Z',
              recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,TU'],
              assignment_strategy: {
                type: 'rotating_member_assignment_strategy',
                members: [{ type: 'user_member', user_id: 'PUSER01' }],
                shifts_per_member: 1,
              },
            },
          },
        })
      ).not.toThrow();
      expect(() =>
        parse('manageSchedules', {
          request: {
            action: 'create_rotation_event',
            schedule_id: 'PSCH01',
            rotation_id: 'R1',
            event_data: { name: 'Weekdays' },
          },
        })
      ).toThrow();
    });

    it('validates team membership roles', () => {
      expect(() =>
        parse('manageTeams', {
          request: {
            action: 'add_member',
            team_id: 'PTEAM01',
            member_data: { user_id: 'PUSER01', role: 'responder' },
          },
        })
      ).not.toThrow();
      expect(() =>
        parse('manageTeams', {
          request: {
            action: 'add_member',
            team_id: 'PTEAM01',
            member_data: { user_id: 'PUSER01', role: 'admin' },
          },
        })
      ).toThrow();
    });

    it('requires at least one update when creating a status page post', () => {
      const post = {
        title: 'Maintenance',
        post_type: 'maintenance',
        starts_at: '2026-09-04T09:00:00Z',
        ends_at: '2026-09-04T10:00:00Z',
        status_page: { id: 'SP1' },
      };
      expect(() =>
        parse('manageStatusPages', {
          request: {
            action: 'create_post',
            status_page_id: 'SP1',
            create_model: { post: { ...post, updates: [] } },
          },
        })
      ).toThrow();
      expect(() =>
        parse('manageStatusPages', {
          request: {
            action: 'create_post',
            status_page_id: 'SP1',
            create_model: {
              post: {
                ...post,
                updates: [{ message: 'Starting', status: { id: 'ST1' }, severity: { id: 'SV1' } }],
              },
            },
          },
        })
      ).not.toThrow();
    });
  });

  // REST actions (call api.pagerduty.com directly)
  describe('triggerIncident action', () => {
    it('posts to /incidents with required fields and From header', async () => {
      const input = parse('triggerIncident', {
        from: 'user@example.com',
        title: 'Prod DB down',
        service_id: 'PIJ90N7',
      });
      const result = await PagerdutyConnector.actions.triggerIncident.handler(mockContext, input);

      expect(mockClientPost).toHaveBeenCalledWith(
        'https://api.pagerduty.com/incidents',
        {
          incident: {
            type: 'incident',
            title: 'Prod DB down',
            service: { id: 'PIJ90N7', type: 'service_reference' },
          },
        },
        {
          headers: {
            From: 'user@example.com',
            Accept: 'application/vnd.pagerduty+json;version=2',
          },
        }
      );
      expect(result).toEqual({ incident: mockIncident });
    });

    it('includes optional fields when provided', async () => {
      const input = parse('triggerIncident', {
        from: 'user@example.com',
        title: 'High CPU',
        service_id: 'PIJ90N7',
        urgency: 'high',
        body: 'CPU usage at 99%',
        escalation_policy_id: 'PABCDEF',
        assignment_user_ids: ['P123ABC'],
      });
      await PagerdutyConnector.actions.triggerIncident.handler(mockContext, input);

      expect(mockClientPost).toHaveBeenCalledWith(
        'https://api.pagerduty.com/incidents',
        {
          incident: {
            type: 'incident',
            title: 'High CPU',
            service: { id: 'PIJ90N7', type: 'service_reference' },
            urgency: 'high',
            body: { type: 'incident_body', details: 'CPU usage at 99%' },
            escalation_policy: { id: 'PABCDEF', type: 'escalation_policy_reference' },
            assignments: [{ assignee: { id: 'P123ABC', type: 'user_reference' } }],
          },
        },
        expect.objectContaining({ headers: expect.objectContaining({ From: 'user@example.com' }) })
      );
    });
  });

  describe('acknowledgeIncident action', () => {
    it('puts to /incidents/{id} with status acknowledged and From header', async () => {
      const input = parse('acknowledgeIncident', {
        from: 'user@example.com',
        incident_id: 'Q1A2B3C4D5E6F7',
      });
      const result = await PagerdutyConnector.actions.acknowledgeIncident.handler(
        mockContext,
        input
      );

      expect(mockClientPut).toHaveBeenCalledWith(
        'https://api.pagerduty.com/incidents/Q1A2B3C4D5E6F7',
        { incident: { type: 'incident', status: 'acknowledged' } },
        {
          headers: {
            From: 'user@example.com',
            Accept: 'application/vnd.pagerduty+json;version=2',
          },
        }
      );
      expect(result).toEqual({ incident: { ...mockIncident, status: 'acknowledged' } });
    });
  });

  describe('resolveIncident action', () => {
    it('puts to /incidents/{id} with status resolved and From header', async () => {
      mockClientPut.mockResolvedValueOnce({
        data: { incident: { ...mockIncident, status: 'resolved' } },
      });
      const input = parse('resolveIncident', {
        from: 'user@example.com',
        incident_id: 'Q1A2B3C4D5E6F7',
      });
      const result = await PagerdutyConnector.actions.resolveIncident.handler(mockContext, input);

      expect(mockClientPut).toHaveBeenCalledWith(
        'https://api.pagerduty.com/incidents/Q1A2B3C4D5E6F7',
        { incident: { type: 'incident', status: 'resolved' } },
        expect.objectContaining({ headers: expect.objectContaining({ From: 'user@example.com' }) })
      );
      expect(result).toEqual({ incident: { ...mockIncident, status: 'resolved' } });
    });
  });

  describe('updateIncident action', () => {
    it('puts to /incidents/{id} with provided fields', async () => {
      const input = parse('updateIncident', {
        from: 'user@example.com',
        incident_id: 'Q1A2B3C4D5E6F7',
        urgency: 'low',
        title: 'Updated title',
      });
      await PagerdutyConnector.actions.updateIncident.handler(mockContext, input);

      expect(mockClientPut).toHaveBeenCalledWith(
        'https://api.pagerduty.com/incidents/Q1A2B3C4D5E6F7',
        {
          incident: {
            type: 'incident',
            urgency: 'low',
            title: 'Updated title',
          },
        },
        expect.objectContaining({ headers: expect.objectContaining({ From: 'user@example.com' }) })
      );
    });

    it('rejects when no update fields are provided', () => {
      expect(() =>
        parse('updateIncident', {
          from: 'user@example.com',
          incident_id: 'Q1A2B3C4D5E6F7',
        })
      ).toThrow();
    });
  });

  describe('listServices action', () => {
    it('gets /services and returns data', async () => {
      const input = parse('listServices', { query: 'production' });
      const result = await PagerdutyConnector.actions.listServices.handler(mockContext, input);

      expect(mockClientGet).toHaveBeenCalledWith(
        'https://api.pagerduty.com/services',
        expect.objectContaining({
          params: { query: 'production' },
          headers: { Accept: 'application/vnd.pagerduty+json;version=2' },
          paramsSerializer: { indexes: null },
        })
      );
      expect(result).toEqual({ services: [{ id: 'PSVC01', name: 'Prod DB' }] });
    });

    it('passes team_ids[] when provided', async () => {
      const input = parse('listServices', { team_ids: ['T1', 'T2'] });
      await PagerdutyConnector.actions.listServices.handler(mockContext, input);

      expect(mockClientGet).toHaveBeenCalledWith(
        'https://api.pagerduty.com/services',
        expect.objectContaining({
          params: { 'team_ids[]': ['T1', 'T2'] },
          paramsSerializer: { indexes: null },
        })
      );
    });
  });

  describe('addResponders action', () => {
    it('posts to /incidents/{id}/responder_requests with user targets', async () => {
      mockClientPost.mockResolvedValueOnce({ data: { responder_request: { id: 'RR01' } } });
      const input = parse('addResponders', {
        from: 'user@example.com',
        incident_id: 'Q1A2B3C4D5E6F7',
        requester_id: 'P123ABC',
        message: 'Need your help',
        responder_user_ids: ['P456DEF'],
      });
      const result = await PagerdutyConnector.actions.addResponders.handler(mockContext, input);

      expect(mockClientPost).toHaveBeenCalledWith(
        'https://api.pagerduty.com/incidents/Q1A2B3C4D5E6F7/responder_requests',
        {
          requester_id: 'P123ABC',
          message: 'Need your help',
          responder_request_targets: [
            { responder_request_target: { id: 'P456DEF', type: 'user_reference' } },
          ],
        },
        expect.objectContaining({ headers: expect.objectContaining({ From: 'user@example.com' }) })
      );
      expect(result).toEqual({ responder_request: { id: 'RR01' } });
    });

    it('includes escalation policy targets', async () => {
      mockClientPost.mockResolvedValueOnce({ data: { responder_request: {} } });
      const input = parse('addResponders', {
        from: 'user@example.com',
        incident_id: 'PINC001',
        requester_id: 'P123ABC',
        message: 'Escalating',
        responder_escalation_policy_ids: ['PABCDEF'],
      });
      await PagerdutyConnector.actions.addResponders.handler(mockContext, input);

      expect(mockClientPost).toHaveBeenCalledWith(
        'https://api.pagerduty.com/incidents/PINC001/responder_requests',
        expect.objectContaining({
          responder_request_targets: [
            {
              responder_request_target: {
                id: 'PABCDEF',
                type: 'escalation_policy_reference',
              },
            },
          ],
        }),
        expect.anything()
      );
    });

    it('rejects when no responder targets are provided', () => {
      expect(() =>
        parse('addResponders', {
          from: 'user@example.com',
          incident_id: 'PINC001',
          requester_id: 'P123ABC',
          message: 'Help',
        })
      ).toThrow();
    });
  });

  describe('runResponsePlay action', () => {
    it('posts to /response_plays/{id}/run with incident and requester', async () => {
      mockClientPost.mockResolvedValueOnce({ data: {} });
      const input = parse('runResponsePlay', {
        from: 'user@example.com',
        incident_id: 'Q1A2B3C4D5E6F7',
        response_play_id: 'PABCDEF',
        requester_id: 'P123ABC',
      });
      const result = await PagerdutyConnector.actions.runResponsePlay.handler(mockContext, input);

      expect(mockClientPost).toHaveBeenCalledWith(
        'https://api.pagerduty.com/response_plays/PABCDEF/run',
        {
          incident: { id: 'Q1A2B3C4D5E6F7', type: 'incident_reference' },
          requester: { id: 'P123ABC', type: 'user_reference' },
        },
        expect.objectContaining({ headers: expect.objectContaining({ From: 'user@example.com' }) })
      );
      expect(result).toEqual({});
    });
  });

  describe('listTools action', () => {
    it('returns the tools from the MCP server', async () => {
      const result = await PagerdutyConnector.actions.listTools.handler(mockContext, {});

      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual([{ name: 'browse_incidents' }, { name: 'manage_incidents' }]);
    });
  });

  describe('callTool action', () => {
    it('calls an arbitrary tool and returns its content parts', async () => {
      const input = parse('callTool', {
        name: 'browse_users',
        arguments: { request: { action: 'get' } },
      });
      const result = await PagerdutyConnector.actions.callTool.handler(mockContext, input as never);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'browse_users',
        arguments: { request: { action: 'get' } },
      });
      expect(result).toEqual(mockContent);
    });

    it('defaults arguments to an empty object', async () => {
      const input = parse('callTool', { name: 'browse_users' });
      await PagerdutyConnector.actions.callTool.handler(mockContext, input as never);

      expect(mockCallTool).toHaveBeenCalledWith({ name: 'browse_users', arguments: {} });
    });
  });

  describe('test handler', () => {
    it('verifies the connection by listing tools', async () => {
      const result = await PagerdutyConnector.test?.handler(mockContext);

      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual({});
    });
  });
});
