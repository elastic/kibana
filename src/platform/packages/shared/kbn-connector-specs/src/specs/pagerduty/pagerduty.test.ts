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

const parse = <K extends keyof typeof PagerdutyConnector.actions>(
  action: K,
  raw: Record<string, unknown>
) => PagerdutyConnector.actions[action].input.parse(raw);

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
      tools: [{ name: 'get_user_data' }, { name: 'list_incidents' }],
    });
    mockClientPost.mockResolvedValue({ data: { incident: mockIncident } });
    mockClientPut.mockResolvedValue({
      data: { incident: { ...mockIncident, status: 'acknowledged' } },
    });
    mockClientGet.mockResolvedValue({ data: { services: [{ id: 'PSVC01', name: 'Prod DB' }] } });
  });

  describe('getUserData action', () => {
    it('calls get_user_data tool and returns parsed JSON', async () => {
      const result = await PagerdutyConnector.actions.getUserData.handler(mockContext, {});

      expect(mockCallTool).toHaveBeenCalledWith({ name: 'get_user_data', arguments: {} });
      expect(result).toEqual(mockJson);
    });
  });

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

  describe('listSchedules action', () => {
    it('passes input as query_model', async () => {
      const input = parse('listSchedules', { query: 'primary' });
      await PagerdutyConnector.actions.listSchedules.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_schedules',
        arguments: { query_model: { query: 'primary' } },
      });
    });

    it('passes all optional filters', async () => {
      const input = parse('listSchedules', {
        query: 'ops',
        limit: 5,
        team_ids: ['T1'],
        user_ids: ['U1'],
        include: ['schedule_layers'],
      });
      await PagerdutyConnector.actions.listSchedules.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_schedules',
        arguments: {
          query_model: {
            query: 'ops',
            limit: 5,
            team_ids: ['T1'],
            user_ids: ['U1'],
            include: ['schedule_layers'],
          },
        },
      });
    });
  });

  describe('listEscalationPolicies action', () => {
    it('passes input as query_model', async () => {
      const input = parse('listEscalationPolicies', { query: 'critical' });
      await PagerdutyConnector.actions.listEscalationPolicies.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_escalation_policies',
        arguments: { query_model: { query: 'critical' } },
      });
    });
  });

  describe('listIncidents action', () => {
    it('passes input as query_model', async () => {
      const input = parse('listIncidents', { status: ['triggered'] });
      await PagerdutyConnector.actions.listIncidents.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_incidents',
        arguments: { query_model: { status: ['triggered'], limit: 25 } },
      });
    });
  });

  describe('listOncalls action', () => {
    it('applies default limit when omitted', async () => {
      const input = parse('listOncalls', {});
      await PagerdutyConnector.actions.listOncalls.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_oncalls',
        arguments: { query_model: { limit: 20 } },
      });
    });

    it('passes custom limit and filters', async () => {
      const input = parse('listOncalls', {
        limit: 5,
        schedule_ids: ['S1'],
        earliest: true,
      });
      await PagerdutyConnector.actions.listOncalls.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_oncalls',
        arguments: {
          query_model: { limit: 5, schedule_ids: ['S1'], earliest: true },
        },
      });
    });
  });

  describe('listUsers action', () => {
    it('passes input as query_model', async () => {
      const input = parse('listUsers', { query: 'alice' });
      await PagerdutyConnector.actions.listUsers.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_users',
        arguments: { query_model: { query: 'alice' } },
      });
    });
  });

  describe('listTeams action', () => {
    it('passes input as query_model', async () => {
      const input = parse('listTeams', { query: 'platform' });
      await PagerdutyConnector.actions.listTeams.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_teams',
        arguments: { query_model: { query: 'platform' } },
      });
    });
  });

  describe('getSchedule action', () => {
    it('calls get_schedule with the schedule_id', async () => {
      await PagerdutyConnector.actions.getSchedule.handler(mockContext, {
        schedule_id: 'PSCHED01',
      });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_schedule',
        arguments: { schedule_id: 'PSCHED01' },
      });
    });
  });

  describe('getIncident action', () => {
    it('calls get_incident with the incident_id', async () => {
      await PagerdutyConnector.actions.getIncident.handler(mockContext, {
        incident_id: 'PINC001',
      });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_incident',
        arguments: { incident_id: 'PINC001' },
      });
    });
  });

  describe('getEscalationPolicy action', () => {
    it('calls get_escalation_policy with the policy_id', async () => {
      await PagerdutyConnector.actions.getEscalationPolicy.handler(mockContext, {
        policy_id: 'PPOL01',
      });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_escalation_policy',
        arguments: { policy_id: 'PPOL01' },
      });
    });
  });

  describe('getTeam action', () => {
    it('calls get_team with the team_id', async () => {
      await PagerdutyConnector.actions.getTeam.handler(mockContext, { team_id: 'PTEAM01' });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_team',
        arguments: { team_id: 'PTEAM01' },
      });
    });
  });

  describe('listTools action', () => {
    it('returns the list of available tools', async () => {
      const result = await PagerdutyConnector.actions.listTools.handler(mockContext, {});

      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual([{ name: 'get_user_data' }, { name: 'list_incidents' }]);
    });
  });

  describe('callTool action', () => {
    it('calls the named tool with provided arguments', async () => {
      const result = await PagerdutyConnector.actions.callTool.handler(mockContext, {
        name: 'list_incidents',
        arguments: { limit: 5 },
      });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_incidents',
        arguments: { limit: 5 },
      });
      expect(result).toEqual(mockContent);
    });

    it('calls the named tool with no arguments when omitted', async () => {
      await PagerdutyConnector.actions.callTool.handler(mockContext, { name: 'get_user_data' });

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_user_data',
        arguments: {},
      });
    });
  });

  describe('test handler', () => {
    it('returns ok with tool count on successful connection', async () => {
      if (!PagerdutyConnector.test) {
        throw new Error('test handler not defined');
      }
      const result = await PagerdutyConnector.test.handler(mockContext);

      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual({
        ok: true,
        message: 'Connected to PagerDuty MCP server. 2 tools available.',
      });
    });

    it('propagates errors thrown by withMcpClient', async () => {
      const { withMcpClient } = jest.requireMock('../../lib/mcp/with_mcp_client');
      withMcpClient.mockRejectedValueOnce(new Error('connection refused'));

      if (!PagerdutyConnector.test) {
        throw new Error('test handler not defined');
      }

      await expect(PagerdutyConnector.test.handler(mockContext)).rejects.toThrow(
        'connection refused'
      );
    });
  });
});
