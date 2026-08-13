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
import { Zabbix } from './zabbix';
import { CreateMaintenanceInputSchema, UpdateMaintenanceInputSchema } from './types';

const RPC_URL = 'https://zabbix.example.com/api_jsonrpc.php';

describe('Zabbix', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { baseUrl: 'https://zabbix.example.com' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const mockRpcResult = (result: unknown) => {
    mockClient.post.mockResolvedValue({ data: { jsonrpc: '2.0', result, id: 1 } });
  };
  const mockRpcError = (message: string, data?: string) => {
    mockClient.post.mockResolvedValue({
      data: { jsonrpc: '2.0', error: { code: -32602, message, data }, id: 1 },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(Zabbix).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.zabbix');
    expect(spec).toBe(Zabbix);
    expect(spec?.actions.getProblems).toBeDefined();
    expect(spec?.actions.getProblems.isTool).toBe(true);
  });

  it('should have correct metadata', () => {
    expect(Zabbix.metadata.id).toBe('.zabbix');
    expect(Zabbix.metadata.displayName).toBe('Zabbix');
    expect(Zabbix.metadata.minimumLicense).toBe('enterprise');
    expect(Zabbix.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
  });

  it('should support bearer auth', () => {
    const types = (Zabbix.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toContain('bearer');
  });

  describe('JSON-RPC transport', () => {
    it('should throw a formatted error when the JSON-RPC body reports an error', async () => {
      mockRpcError('Invalid params.', 'No groups for host "Linux server".');

      await expect(Zabbix.actions.getProblems.handler(mockContext, {})).rejects.toThrow(
        'Zabbix API error calling problem.get: Invalid params. — No groups for host "Linux server".'
      );
    });

    it('should throw a formatted error on a transport-level failure', async () => {
      mockClient.post.mockRejectedValue({ response: { status: 401 }, message: 'Unauthorized' });

      await expect(Zabbix.actions.getProblems.handler(mockContext, {})).rejects.toThrow(
        'Zabbix problem.get request failed (status 401): Unauthorized'
      );
    });

    it('should throw when the base URL is not configured', async () => {
      const ctxNoUrl = { ...mockContext, config: {} } as unknown as ActionContext;

      await expect(Zabbix.actions.getProblems.handler(ctxNoUrl, {})).rejects.toThrow(
        'Zabbix connector is missing the required base URL configuration field.'
      );
    });
  });

  describe('getProblems action', () => {
    it('should fetch problems with defaults when no filters are given', async () => {
      mockRpcResult([{ eventid: '1', name: 'Load average is too high' }]);

      const result = await Zabbix.actions.getProblems.handler(mockContext, {});

      expect(mockClient.post).toHaveBeenCalledWith(RPC_URL, {
        jsonrpc: '2.0',
        method: 'problem.get',
        params: {
          output: 'extend',
          selectTags: 'extend',
          selectAcknowledges: 'extend',
          selectSuppressionData: 'extend',
          sortfield: ['eventid'],
          sortorder: 'DESC',
          limit: 100,
        },
        id: 1,
      });
      expect(result).toEqual({ problems: [{ eventid: '1', name: 'Load average is too high' }] });
    });

    it('should map severities, tags, and IDs to Zabbix wire format', async () => {
      mockRpcResult([]);

      await Zabbix.actions.getProblems.handler(mockContext, {
        eventIds: ['1245463'],
        hostIds: ['10084'],
        groupIds: ['2'],
        severities: ['high', 'disaster'],
        tags: [{ tag: 'scope', value: 'capacity', operator: 'equals' }],
        acknowledged: false,
        suppressed: true,
        recent: true,
        limit: 25,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          method: 'problem.get',
          params: expect.objectContaining({
            eventids: ['1245463'],
            hostids: ['10084'],
            groupids: ['2'],
            severities: [4, 5],
            tags: [{ tag: 'scope', value: 'capacity', operator: 1 }],
            acknowledged: false,
            suppressed: true,
            recent: true,
            limit: 25,
          }),
        })
      );
    });
  });

  describe('getEvent action', () => {
    it('should fetch full event detail by IDs', async () => {
      mockRpcResult([{ eventid: '20427', r_eventid: '0' }]);

      const result = await Zabbix.actions.getEvent.handler(mockContext, {
        eventIds: ['20427'],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          method: 'event.get',
          params: expect.objectContaining({ eventids: ['20427'], output: 'extend' }),
        })
      );
      expect(result).toEqual({ events: [{ eventid: '20427', r_eventid: '0' }] });
    });
  });

  describe('problem-lifecycle actions (event.acknowledge)', () => {
    it('acknowledgeProblem should send action=2', async () => {
      mockRpcResult({ eventids: ['20427'] });

      const result = await Zabbix.actions.acknowledgeProblem.handler(mockContext, {
        eventIds: ['20427'],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          method: 'event.acknowledge',
          params: { eventids: ['20427'], action: 2 },
        })
      );
      expect(result).toEqual({ eventids: ['20427'] });
    });

    it('unacknowledgeProblem should send action=16', async () => {
      mockRpcResult({ eventids: ['20427'] });

      await Zabbix.actions.unacknowledgeProblem.handler(mockContext, { eventIds: ['20427'] });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({ params: { eventids: ['20427'], action: 16 } })
      );
    });

    it('addProblemMessage should send action=4 with the message', async () => {
      mockRpcResult({ eventids: ['20427'] });

      await Zabbix.actions.addProblemMessage.handler(mockContext, {
        eventIds: ['20427'],
        message: 'Problem resolved.',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          params: { eventids: ['20427'], action: 4, message: 'Problem resolved.' },
        })
      );
    });

    it('closeProblem should send action=1', async () => {
      mockRpcResult({ eventids: ['20427'] });

      await Zabbix.actions.closeProblem.handler(mockContext, { eventIds: ['20427'] });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({ params: { eventids: ['20427'], action: 1 } })
      );
    });

    it('changeProblemSeverity should send action=8 with the numeric severity', async () => {
      mockRpcResult({ eventids: ['20427'] });

      await Zabbix.actions.changeProblemSeverity.handler(mockContext, {
        eventIds: ['20427'],
        severity: 'high',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          params: { eventids: ['20427'], action: 8, severity: 4 },
        })
      );
    });

    it('suppressProblem should default suppress_until to 0 (indefinite)', async () => {
      mockRpcResult({ eventids: ['20427'] });

      await Zabbix.actions.suppressProblem.handler(mockContext, { eventIds: ['20427'] });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          params: { eventids: ['20427'], action: 32, suppress_until: 0 },
        })
      );
    });

    it('suppressProblem should pass an explicit suppressUntil timestamp', async () => {
      mockRpcResult({ eventids: ['20427'] });

      await Zabbix.actions.suppressProblem.handler(mockContext, {
        eventIds: ['20427'],
        suppressUntil: 1900000000,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          params: { eventids: ['20427'], action: 32, suppress_until: 1900000000 },
        })
      );
    });

    it('unsuppressProblem should send action=64', async () => {
      mockRpcResult({ eventids: ['20427'] });

      await Zabbix.actions.unsuppressProblem.handler(mockContext, { eventIds: ['20427'] });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({ params: { eventids: ['20427'], action: 64 } })
      );
    });
  });

  describe('createMaintenance action', () => {
    it('should build a one-time timeperiod from activeSince/activeTill', async () => {
      mockRpcResult({ maintenanceids: ['3'] });

      const result = await Zabbix.actions.createMaintenance.handler(mockContext, {
        name: 'DB01 patching',
        groupIds: ['2'],
        activeSince: 1773720240,
        activeTill: 1773723840,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          method: 'maintenance.create',
          params: expect.objectContaining({
            name: 'DB01 patching',
            active_since: 1773720240,
            active_till: 1773723840,
            maintenance_type: 0,
            groups: [{ groupid: '2' }],
            timeperiods: [{ timeperiod_type: 0, start_date: 1773720240, period: 3600 }],
          }),
        })
      );
      expect(result).toEqual({ maintenanceids: ['3'] });
    });

    it('should send maintenance_type=1 and omit tags when withDataCollection is false', async () => {
      mockRpcResult({ maintenanceids: ['4'] });

      await Zabbix.actions.createMaintenance.handler(mockContext, {
        name: 'Full outage',
        hostIds: ['10084'],
        activeSince: 1000,
        activeTill: 2000,
        withDataCollection: false,
        tags: [{ tag: 'service', value: 'mysqld', matchExactly: true }],
      });

      const params = mockClient.post.mock.calls[0][1].params;
      expect(params.maintenance_type).toBe(1);
      expect(params.tags).toBeUndefined();
    });

    it('should map tag filters to Zabbix operator codes', async () => {
      mockRpcResult({ maintenanceids: ['5'] });

      await Zabbix.actions.createMaintenance.handler(mockContext, {
        name: 'Tagged window',
        hostIds: ['10084'],
        activeSince: 1000,
        activeTill: 2000,
        tags: [{ tag: 'service', value: 'mysqld', matchExactly: true }, { tag: 'error' }],
      });

      const params = mockClient.post.mock.calls[0][1].params;
      expect(params.tags).toEqual([
        { tag: 'service', operator: 0, value: 'mysqld' },
        { tag: 'error', operator: 2, value: '' },
      ]);
    });
  });

  describe('CreateMaintenanceInputSchema validation', () => {
    const validInput = {
      name: 'DB01 patching',
      hostIds: ['10084'],
      activeSince: 1000,
      activeTill: 2000,
    };

    it('accepts a valid input', () => {
      expect(() => CreateMaintenanceInputSchema.parse(validInput)).not.toThrow();
    });

    it('rejects when neither hostIds nor groupIds is provided', () => {
      expect(() =>
        CreateMaintenanceInputSchema.parse({
          name: validInput.name,
          activeSince: validInput.activeSince,
          activeTill: validInput.activeTill,
        })
      ).toThrow(/At least one of hostIds or groupIds is required/);
    });

    it('rejects when activeTill is not after activeSince', () => {
      expect(() =>
        CreateMaintenanceInputSchema.parse({ ...validInput, activeSince: 2000, activeTill: 1000 })
      ).toThrow(/activeTill must be after activeSince/);
    });
  });

  describe('UpdateMaintenanceInputSchema validation', () => {
    it('rejects when no field to update is provided', () => {
      expect(() => UpdateMaintenanceInputSchema.parse({ maintenanceId: '3' })).toThrow(
        /At least one field to update must be provided/
      );
    });

    it('rejects activeSince without activeTill', () => {
      expect(() =>
        UpdateMaintenanceInputSchema.parse({ maintenanceId: '3', activeSince: 1000 })
      ).toThrow(/activeSince and activeTill must be provided together/);
    });

    it('rejects activeTill without activeSince', () => {
      expect(() =>
        UpdateMaintenanceInputSchema.parse({ maintenanceId: '3', activeTill: 2000 })
      ).toThrow(/activeSince and activeTill must be provided together/);
    });

    it('rejects activeTill before activeSince', () => {
      expect(() =>
        UpdateMaintenanceInputSchema.parse({
          maintenanceId: '3',
          activeSince: 2000,
          activeTill: 1000,
        })
      ).toThrow(/activeSince and activeTill must be provided together/);
    });

    it('accepts a valid partial update', () => {
      expect(() =>
        UpdateMaintenanceInputSchema.parse({ maintenanceId: '3', name: 'Extended window' })
      ).not.toThrow();
    });
  });

  describe('updateMaintenance action', () => {
    it('should only send the provided fields', async () => {
      mockRpcResult({ maintenanceids: ['3'] });

      await Zabbix.actions.updateMaintenance.handler(mockContext, {
        maintenanceId: '3',
        name: 'Extended window',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          method: 'maintenance.update',
          params: { maintenanceid: '3', name: 'Extended window' },
        })
      );
    });

    it('should recompute the one-time timeperiod when the window changes', async () => {
      mockRpcResult({ maintenanceids: ['3'] });

      await Zabbix.actions.updateMaintenance.handler(mockContext, {
        maintenanceId: '3',
        activeSince: 1000,
        activeTill: 5000,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          params: {
            maintenanceid: '3',
            active_since: 1000,
            active_till: 5000,
            timeperiods: [{ timeperiod_type: 0, start_date: 1000, period: 4000 }],
          },
        })
      );
    });
  });

  describe('deleteMaintenance action', () => {
    it('should send maintenance IDs as a flat array (Zabbix delete convention)', async () => {
      mockRpcResult({ maintenanceids: ['3', '4'] });

      const result = await Zabbix.actions.deleteMaintenance.handler(mockContext, {
        maintenanceIds: ['3', '4'],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({ method: 'maintenance.delete', params: ['3', '4'] })
      );
      expect(result).toEqual({ maintenanceids: ['3', '4'] });
    });
  });

  describe('getMaintenances action', () => {
    it('should list maintenances with optional filters', async () => {
      mockRpcResult([{ maintenanceid: '3', name: 'DB01 patching' }]);

      const result = await Zabbix.actions.getMaintenances.handler(mockContext, {
        hostIds: ['10084'],
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          method: 'maintenance.get',
          params: expect.objectContaining({ hostids: ['10084'] }),
        })
      );
      expect(result).toEqual({ maintenances: [{ maintenanceid: '3', name: 'DB01 patching' }] });
    });
  });

  describe('getHosts action', () => {
    it('should resolve hosts by name with wildcard search enabled', async () => {
      mockRpcResult([{ hostid: '10084', host: 'Zabbix server', status: '0' }]);

      const result = await Zabbix.actions.getHosts.handler(mockContext, { name: 'Zabbix' });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          method: 'host.get',
          params: expect.objectContaining({
            search: { name: 'Zabbix' },
            searchWildcardsEnabled: true,
          }),
        })
      );
      expect(result).toEqual({ hosts: [{ hostid: '10084', host: 'Zabbix server', status: '0' }] });
    });

    it('should map status filter to the numeric wire value', async () => {
      mockRpcResult([]);

      await Zabbix.actions.getHosts.handler(mockContext, { status: 'disabled' });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({ params: expect.objectContaining({ filter: { status: 1 } }) })
      );
    });
  });

  describe('disableHost / enableHost actions', () => {
    it('disableHost should set status=1 for each host', async () => {
      mockRpcResult({ hostids: ['10084', '10085'] });

      await Zabbix.actions.disableHost.handler(mockContext, { hostIds: ['10084', '10085'] });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          method: 'host.update',
          params: [
            { hostid: '10084', status: 1 },
            { hostid: '10085', status: 1 },
          ],
        })
      );
    });

    it('enableHost should set status=0 for each host', async () => {
      mockRpcResult({ hostids: ['10084'] });

      await Zabbix.actions.enableHost.handler(mockContext, { hostIds: ['10084'] });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          method: 'host.update',
          params: [{ hostid: '10084', status: 0 }],
        })
      );
    });
  });

  describe('disableTrigger / enableTrigger actions', () => {
    it('disableTrigger should set status=1 for each trigger', async () => {
      mockRpcResult({ triggerids: ['13938'] });

      await Zabbix.actions.disableTrigger.handler(mockContext, { triggerIds: ['13938'] });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          method: 'trigger.update',
          params: [{ triggerid: '13938', status: 1 }],
        })
      );
    });

    it('enableTrigger should set status=0 for each trigger', async () => {
      mockRpcResult({ triggerids: ['13938'] });

      await Zabbix.actions.enableTrigger.handler(mockContext, { triggerIds: ['13938'] });

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          method: 'trigger.update',
          params: [{ triggerid: '13938', status: 0 }],
        })
      );
    });
  });

  describe('getItemHistory action', () => {
    it('should look up the item value_type before calling history.get', async () => {
      mockClient.post
        .mockResolvedValueOnce({
          data: {
            jsonrpc: '2.0',
            result: [{ itemid: '24759', name: 'Free disk space', value_type: '3' }],
            id: 1,
          },
        })
        .mockResolvedValueOnce({
          data: {
            jsonrpc: '2.0',
            result: [{ itemid: '24759', clock: '1728657737', value: '512' }],
            id: 1,
          },
        });

      const result = await Zabbix.actions.getItemHistory.handler(mockContext, {
        itemId: '24759',
      });

      expect(mockClient.post).toHaveBeenNthCalledWith(
        1,
        RPC_URL,
        expect.objectContaining({
          method: 'item.get',
          params: { itemids: ['24759'], output: ['itemid', 'name', 'key_', 'value_type'] },
        })
      );
      expect(mockClient.post).toHaveBeenNthCalledWith(
        2,
        RPC_URL,
        expect.objectContaining({
          method: 'history.get',
          params: expect.objectContaining({ itemids: ['24759'], history: 3, limit: 100 }),
        })
      );
      expect(result).toEqual({
        item: { itemid: '24759', name: 'Free disk space', value_type: '3' },
        history: [{ itemid: '24759', clock: '1728657737', value: '512' }],
      });
    });

    it('should throw when the item does not exist', async () => {
      mockRpcResult([]);

      await expect(
        Zabbix.actions.getItemHistory.handler(mockContext, { itemId: '99999' })
      ).rejects.toThrow('Zabbix item 99999 was not found.');
    });

    it('should pass through the optional time range', async () => {
      mockClient.post
        .mockResolvedValueOnce({
          data: { jsonrpc: '2.0', result: [{ itemid: '1', value_type: '0' }], id: 1 },
        })
        .mockResolvedValueOnce({ data: { jsonrpc: '2.0', result: [], id: 1 } });

      await Zabbix.actions.getItemHistory.handler(mockContext, {
        itemId: '1',
        timeFrom: 1000,
        timeTill: 2000,
        limit: 10,
      });

      expect(mockClient.post).toHaveBeenNthCalledWith(
        2,
        RPC_URL,
        expect.objectContaining({
          params: expect.objectContaining({ time_from: 1000, time_till: 2000, limit: 10 }),
        })
      );
    });
  });

  describe('test handler', () => {
    it('should succeed when a host can be listed', async () => {
      mockRpcResult([{ hostid: '10084', host: 'Zabbix server' }]);

      const result = await Zabbix.test.handler(mockContext);

      expect(mockClient.post).toHaveBeenCalledWith(
        RPC_URL,
        expect.objectContaining({
          method: 'host.get',
          params: { output: ['hostid', 'host'], limit: 1 },
        })
      );
      expect(result.message).toContain('1');
    });

    it('should throw a formatted error on failure', async () => {
      mockRpcError('Session terminated, re-login, please.');

      await expect(Zabbix.test.handler(mockContext)).rejects.toThrow(
        'Zabbix API error calling host.get: Session terminated, re-login, please.'
      );
    });
  });
});
