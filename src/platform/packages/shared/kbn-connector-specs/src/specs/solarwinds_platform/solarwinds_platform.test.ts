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
import { SolarWindsPlatform } from './solarwinds_platform';
import {
  AcknowledgeAlertInputSchema,
  GetAlertInputSchema,
  GetNodeInputSchema,
  ListActiveAlertsInputSchema,
  QueryInputSchema,
  SearchNodesInputSchema,
} from './types';

const SWIS_URL = 'https://orion.example.com:17774/SolarWinds/InformationService/v3/Json';
const NODE_URI = 'swis://orion.example.com/Orion/Orion.Nodes/NodeID=7';

describe('SolarWindsPlatform', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { url: 'https://orion.example.com:17774/' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const runAction = (name: string, input: unknown) => {
    const action = SolarWindsPlatform.actions[name];
    return action.handler(mockContext, action.input.parse(input));
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is discoverable via getConnectorSpec', () => {
    expect(getConnectorSpec('.solarwinds_platform')).toBe(SolarWindsPlatform);
  });

  it('has the expected metadata and auth', () => {
    expect(SolarWindsPlatform.metadata.id).toBe('.solarwinds_platform');
    expect(SolarWindsPlatform.metadata.supportedFeatureIds).toEqual(['workflows']);
    expect(SolarWindsPlatform.test?.enabled).toBe(true);
    const types = (SolarWindsPlatform.auth?.types as Array<{ type: string }>).map(
      ({ type }) => type
    );
    expect(types).toEqual(['basic_with_tls']);
  });

  describe('input schemas', () => {
    it('rejects a query parameter name that is not a SWQL identifier', () => {
      expect(
        QueryInputSchema.safeParse({ query: 'SELECT 1', parameters: { 'a b': 1 } }).success
      ).toBe(false);
    });

    it('defaults limit and offset on list actions', () => {
      expect(ListActiveAlertsInputSchema.parse({})).toEqual({ limit: 50, offset: 0 });
      expect(SearchNodesInputSchema.parse({})).toEqual({ limit: 50, offset: 0 });
    });

    it('rejects a limit above 500', () => {
      expect(ListActiveAlertsInputSchema.safeParse({ limit: 501 }).success).toBe(false);
    });

    it('requires exactly one alert ID in getAlert', () => {
      expect(GetAlertInputSchema.safeParse({}).success).toBe(false);
      expect(GetAlertInputSchema.safeParse({ alertActiveId: 1, alertObjectId: 2 }).success).toBe(
        false
      );
      expect(GetAlertInputSchema.safeParse({ alertObjectId: 2 }).success).toBe(true);
    });

    it('requires exactly one node identifier in getNode', () => {
      expect(GetNodeInputSchema.safeParse({}).success).toBe(false);
      expect(GetNodeInputSchema.safeParse({ nodeId: 1, caption: 'sw' }).success).toBe(false);
      expect(GetNodeInputSchema.safeParse({ ipAddress: 'not-an-ip' }).success).toBe(false);
      expect(GetNodeInputSchema.safeParse({ ipAddress: '10.0.0.1' }).success).toBe(true);
    });

    it('caps acknowledgeAlert at 100 alert object IDs', () => {
      const ids = Array.from({ length: 101 }, (_, i) => i + 1);
      expect(AcknowledgeAlertInputSchema.safeParse({ alertObjectIds: ids }).success).toBe(false);
    });

    it('rejects a custom property name that could inject SWQL', () => {
      expect(
        SearchNodesInputSchema.safeParse({
          customProperty: { name: 'Site = 1 OR 1', value: 'x' },
        }).success
      ).toBe(false);
    });
  });

  describe('query', () => {
    it('posts the query and parameters to the SWIS Query endpoint', async () => {
      mockClient.post.mockResolvedValue({ data: { results: [{ NodeID: 1 }] } });

      const result = await runAction('query', {
        query: 'SELECT NodeID FROM Orion.Nodes WHERE Vendor = @vendor',
        parameters: { vendor: 'Cisco' },
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${SWIS_URL}/Query`, {
        query: 'SELECT NodeID FROM Orion.Nodes WHERE Vendor = @vendor',
        parameters: { vendor: 'Cisco' },
      });
      expect(result).toEqual({
        results: [{ NodeID: 1 }],
        count: 1,
        totalRows: undefined,
        truncated: false,
      });
    });

    it('truncates results above 1000 rows', async () => {
      const rows = Array.from({ length: 1001 }, (_, i) => ({ NodeID: i }));
      mockClient.post.mockResolvedValue({ data: { results: rows } });

      const result = await runAction('query', { query: 'SELECT NodeID FROM Orion.Nodes' });

      expect(result).toMatchObject({ count: 1000, truncated: true });
    });

    it('surfaces the SWIS error message', async () => {
      mockClient.post.mockRejectedValue({
        message: 'Request failed with status code 400',
        response: { status: 400, data: { Message: 'Source entity [Orion.Nodez] not found' } },
      });

      await expect(runAction('query', { query: 'SELECT NodeID FROM Orion.Nodez' })).rejects.toThrow(
        'SolarWinds query failed (status 400): Source entity [Orion.Nodez] not found'
      );
    });

    it('explains a 401 as rejected credentials', async () => {
      mockClient.post.mockRejectedValue({ message: 'Unauthorized', response: { status: 401 } });

      await expect(runAction('query', { query: 'SELECT NodeID FROM Orion.Nodes' })).rejects.toThrow(
        'the username or password was rejected'
      );
    });
  });

  describe('listActiveAlerts', () => {
    it('adds the severity name and the next page offset', async () => {
      mockClient.post.mockResolvedValue({
        data: { totalRows: 3, results: [{ AlertActiveID: 10, AlertObjectID: 20, Severity: 2 }] },
      });

      const result = await runAction('listActiveAlerts', { limit: 1 });

      expect(result).toEqual({
        alerts: [{ AlertActiveID: 10, AlertObjectID: 20, Severity: 2, SeverityName: 'critical' }],
        totalRows: 3,
        nextOffset: 1,
      });
    });

    it('returns no next offset on the last page', async () => {
      mockClient.post.mockResolvedValue({
        data: { totalRows: 1, results: [{ AlertActiveID: 10, Severity: 1 }] },
      });

      const result = await runAction('listActiveAlerts', {});

      expect(result).toMatchObject({ nextOffset: undefined });
    });
  });

  describe('getAlert', () => {
    it('returns the alert with its severity name', async () => {
      mockClient.post.mockResolvedValue({
        data: { results: [{ AlertActiveID: 10, Severity: 0, AlertNote: 'checked' }] },
      });

      const result = await runAction('getAlert', { alertActiveId: 10 });

      expect(result).toEqual({
        AlertActiveID: 10,
        Severity: 0,
        AlertNote: 'checked',
        SeverityName: 'information',
      });
    });

    it('fails when the alert is no longer active', async () => {
      mockClient.post.mockResolvedValue({ data: { results: [] } });

      await expect(runAction('getAlert', { alertObjectId: 99 })).rejects.toThrow(
        'SolarWinds has no active alert with this ID'
      );
    });
  });

  describe('acknowledgeAlert', () => {
    it('invokes Orion.AlertActive.Acknowledge and reports which IDs are now acknowledged', async () => {
      mockClient.post
        .mockResolvedValueOnce({ data: true })
        .mockResolvedValueOnce({ data: { results: [{ AlertObjectID: 20 }] } });

      const result = await runAction('acknowledgeAlert', {
        alertObjectIds: [20, 21],
        note: 'INC0012345',
      });

      expect(mockClient.post).toHaveBeenNthCalledWith(
        1,
        `${SWIS_URL}/Invoke/Orion.AlertActive/Acknowledge`,
        [[20, 21], 'INC0012345']
      );
      expect(mockClient.post).toHaveBeenNthCalledWith(2, `${SWIS_URL}/Query`, {
        query:
          'SELECT aa.AlertObjectID FROM Orion.AlertActive aa WHERE aa.Acknowledged = true AND aa.AlertObjectID IN (@id0, @id1)',
        parameters: { id0: 20, id1: 21 },
      });
      expect(result).toEqual({
        acknowledgedAlertObjectIds: [20],
        notAcknowledgedAlertObjectIds: [21],
      });
    });

    it('sends an empty note when no note is given', async () => {
      mockClient.post
        .mockResolvedValueOnce({ data: true })
        .mockResolvedValueOnce({ data: { results: [{ AlertObjectID: 20 }] } });

      await runAction('acknowledgeAlert', { alertObjectIds: [20] });

      expect(mockClient.post).toHaveBeenNthCalledWith(1, expect.any(String), [[20], '']);
    });

    it('fails when no alert is acknowledged, although SWIS returns true', async () => {
      mockClient.post
        .mockResolvedValueOnce({ data: true })
        .mockResolvedValueOnce({ data: { results: [] } });

      await expect(runAction('acknowledgeAlert', { alertObjectIds: [33] })).rejects.toThrow(
        'SolarWinds acknowledged no alerts'
      );
    });
  });

  describe('getNode', () => {
    it('returns the node with its custom properties and without system fields', async () => {
      mockClient.post.mockResolvedValue({
        data: { results: [{ NodeID: 7, Caption: 'core-sw-01', Uri: NODE_URI }] },
      });
      mockClient.get.mockResolvedValue({
        data: {
          NodeID: 7,
          DisplayName: null,
          Description: null,
          InstanceType: 'Orion.NodesCustomProperties',
          Uri: `${NODE_URI}/CustomProperties`,
          InstanceSiteId: 0,
          Site: 'Abu Dhabi',
          HaPeer: 'core-sw-02',
        },
      });

      const result = await runAction('getNode', { caption: 'core-sw-01' });

      expect(mockClient.get).toHaveBeenCalledWith(`${SWIS_URL}/${NODE_URI}/CustomProperties`);
      expect(result).toEqual({
        NodeID: 7,
        Caption: 'core-sw-01',
        Uri: NODE_URI,
        customProperties: { Site: 'Abu Dhabi', HaPeer: 'core-sw-02' },
      });
    });

    it('fails when no node matches', async () => {
      mockClient.post.mockResolvedValue({ data: { results: [] } });

      await expect(runAction('getNode', { nodeId: 404 })).rejects.toThrow(
        'SolarWinds has no node that matches'
      );
    });

    it('fails when more than one node matches', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          results: [
            { NodeID: 1, Uri: NODE_URI },
            { NodeID: 2, Uri: NODE_URI },
          ],
        },
      });

      await expect(runAction('getNode', { ipAddress: '10.0.0.1' })).rejects.toThrow(
        'More than one SolarWinds node matches'
      );
      expect(mockClient.get).not.toHaveBeenCalled();
    });
  });

  describe('searchNodes', () => {
    it('returns the nodes and the next page offset', async () => {
      mockClient.post.mockResolvedValue({
        data: { totalRows: 120, results: [{ NodeID: 1 }, { NodeID: 2 }] },
      });

      const result = await runAction('searchNodes', { limit: 2, offset: 50 });

      expect(result).toEqual({
        nodes: [{ NodeID: 1 }, { NodeID: 2 }],
        totalRows: 120,
        nextOffset: 52,
      });
    });
  });

  describe('test handler', () => {
    it('counts the nodes', async () => {
      mockClient.post.mockResolvedValue({ data: { results: [{ NodeCount: 3 }] } });

      const result = await SolarWindsPlatform.test?.handler(mockContext);

      expect(result).toEqual({ nodeCount: 3 });
    });

    it('fails when the URL is not configured', async () => {
      const context = { ...mockContext, config: {} } as unknown as ActionContext;

      await expect(SolarWindsPlatform.test?.handler(context)).rejects.toThrow(
        new Error('SolarWinds connector is missing the required URL configuration field.')
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });
  });
});
