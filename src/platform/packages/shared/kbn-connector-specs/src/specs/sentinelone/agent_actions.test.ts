/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestCase } from './test_helpers';
import {
  API,
  expectDocumentedRequest,
  httpError,
  listBody,
  request,
  resetMocksAroundEachTest,
  run,
  vendorParams,
} from './test_helpers';

resetMocksAroundEachTest();

/** One row per single-request action: input, then the exact request it must send. */
const REQUEST_CASES: RequestCase[] = [
  [
    'getAgents',
    {
      computerName: 'host-1',
      ip: '10.0.0',
      ids: ['11', '12'],
      limit: 5,
      additionalFilters: { osTypes: ['windows'], isActive: true },
    },
    {
      method: 'GET',
      path: '/agents',
      params: vendorParams([
        ['computerName', 'host-1'],
        ['networkInterfaceInet__contains', '10.0.0'],
        ['ids', '11,12'],
        ['limit', 5],
        ['osTypes', 'windows'],
        ['isActive', true],
      ]),
    },
  ],
  [
    'initiateScan',
    { agentIds: ['11'] },
    { method: 'POST', path: '/agents/actions/initiate-scan', data: { filter: { ids: ['11'] } } },
  ],
  [
    'abortScan',
    { agentIds: ['11'] },
    { method: 'POST', path: '/agents/actions/abort-scan', data: { filter: { ids: ['11'] } } },
  ],
  [
    'shutdownAgent',
    { agentIds: ['11'] },
    { method: 'POST', path: '/agents/actions/shutdown', data: { filter: { ids: ['11'] } } },
  ],
  [
    'broadcastMessage',
    { agentIds: ['11'], message: 'Reboot at 5' },
    {
      method: 'POST',
      path: '/agents/actions/broadcast',
      data: { filter: { ids: ['11'] }, data: { message: 'Reboot at 5' } },
    },
  ],
  [
    'fetchAgentFiles',
    { agentId: '11', files: ['C:\\temp\\a.txt'], zipPassCode: 'Secret-Pass-123' },
    {
      method: 'POST',
      path: '/agents/11/actions/fetch-files',
      data: { data: { files: ['C:\\temp\\a.txt'], password: 'Secret-Pass-123' } },
    },
  ],
  [
    'getInstalledApplications',
    { agentIds: ['11', '12'] },
    { method: 'GET', path: '/agents/applications', params: { ids: '11,12' } },
  ],
  [
    'getActivities',
    { agentIds: ['11'], activityTypes: [81], createdAtGte: '2026-01-01T00:00:00Z', limit: 10 },
    {
      method: 'GET',
      path: '/activities',
      params: vendorParams([
        ['agentIds', '11'],
        ['activityTypes', '81'],
        ['createdAt__gte', '2026-01-01T00:00:00Z'],
        ['limit', 10],
      ]),
    },
  ],
];

describe('request shapes', () => {
  it.each(REQUEST_CASES)('%s sends the documented request', expectDocumentedRequest);
});

describe('isolateHost and releaseHost', () => {
  it('reads the agents, skips those already isolated and isolates the rest', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([
          { id: '11', networkStatus: 'connected' },
          { id: '12', networkStatus: 'disconnected' },
        ]),
      })
      .mockResolvedValueOnce({ status: 200, data: { data: { affected: 1 } } });
    const result = await run('isolateHost', { agentIds: ['11', '12', '13'] });
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        method: 'GET',
        url: `${API}/agents`,
        params: { ids: '11,12,13', limit: 3 },
      })
    );
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        method: 'POST',
        url: `${API}/agents/actions/disconnect`,
        data: { filter: { ids: ['11'] } },
      })
    );
    expect(result).toEqual({
      data: { affected: 1 },
      requested: ['11'],
      skipped: ['12'],
      notFound: ['13'],
    });
  });

  it('succeeds without an isolate request and lists every id as notFound when none of the ids exist', async () => {
    request.mockResolvedValueOnce({ status: 200, data: listBody([]) });
    await expect(run('isolateHost', { agentIds: ['11', '12'] })).resolves.toEqual({
      data: { affected: 0 },
      requested: [],
      skipped: [],
      notFound: ['11', '12'],
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('succeeds without an isolate request and lists every id as skipped when every agent is already isolated', async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: listBody([
        { id: '11', networkStatus: 'disconnected' },
        { id: '12', networkStatus: 'disconnecting' },
      ]),
    });
    await expect(run('isolateHost', { agentIds: ['11', '12'] })).resolves.toEqual({
      data: { affected: 0 },
      requested: [],
      skipped: ['11', '12'],
      notFound: [],
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('succeeds without a release request when every agent is already connected or not found', async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: listBody([
        { id: '11', networkStatus: 'connected' },
        { id: '12', networkStatus: 'connecting' },
      ]),
    });
    await expect(run('releaseHost', { agentIds: ['11', '12', '13'] })).resolves.toEqual({
      data: { affected: 0 },
      requested: [],
      skipped: ['11', '12'],
      notFound: ['13'],
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('still fails when SentinelOne reports 0 affected agents for ids that were requested', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([{ id: '11', networkStatus: 'connected' }]),
      })
      .mockResolvedValueOnce({ status: 200, data: { data: { affected: 0 } } });
    await expect(run('isolateHost', { agentIds: ['11'] })).rejects.toThrow(
      'SentinelOne did not apply isolateHost to 11: SentinelOne reported 0 affected objects'
    );
  });

  it('fails when the agent read is rejected (HTTP 403) and sends no isolate request', async () => {
    request.mockRejectedValueOnce(
      httpError(403, { errors: [{ code: 4030010, title: 'Insufficient permissions' }] })
    );
    await expect(run('isolateHost', { agentIds: ['11'] })).rejects.toThrow('Status code: 403');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('releases a disconnected agent through /agents/actions/connect', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([{ id: '11', networkStatus: 'disconnected' }]),
      })
      .mockResolvedValueOnce({ status: 200, data: { data: { affected: 1 } } });
    await expect(run('releaseHost', { agentIds: ['11'] })).resolves.toEqual({
      data: { affected: 1 },
      requested: ['11'],
      skipped: [],
      notFound: [],
    });
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        method: 'POST',
        url: `${API}/agents/actions/connect`,
        data: { filter: { ids: ['11'] } },
      })
    );
  });

  it('does not retry the isolate call on 503 (state-changing)', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([{ id: '11', networkStatus: 'connected' }]),
      })
      .mockRejectedValueOnce(httpError(503, { errors: [{ title: 'Unavailable' }] }));
    await expect(run('isolateHost', { agentIds: ['11'] })).rejects.toThrow('Status code: 503');
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('moveAgent', () => {
  const inGroup = (id: string, groupId: string) => ({ id, groupId });
  const move = (agentIds: string[] = ['11']) => run('moveAgent', { groupId: '77', agentIds });

  it('reads the agents, then moves only those not in the group (live: HTTP 200 with data.agentsMoved)', async () => {
    request
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([inGroup('11', '70'), inGroup('12', '77')]),
      })
      .mockResolvedValueOnce({ status: 200, data: { data: { agentsMoved: 1 } } });
    await expect(move(['11', '12', '13'])).resolves.toEqual({
      data: { agentsMoved: 1 },
      requested: ['11'],
      skipped: ['12'],
      notFound: ['13'],
    });
    expect(request.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        method: 'GET',
        url: `${API}/agents`,
        params: { ids: '11,12,13', limit: 3 },
      })
    );
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        method: 'PUT',
        url: `${API}/groups/77/move-agents`,
        data: { filter: { ids: ['11'] } },
      })
    );
  });

  it('succeeds without a move request and lists every id as skipped when the agents are already in the group', async () => {
    request.mockResolvedValueOnce({ status: 200, data: listBody([inGroup('11', '77')]) });
    await expect(move()).resolves.toEqual({
      data: { agentsMoved: 0 },
      requested: [],
      skipped: ['11'],
      notFound: [],
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('succeeds without a move request and lists every id as notFound when no agent exists', async () => {
    request.mockResolvedValueOnce({ status: 200, data: listBody([]) });
    await expect(move(['11', '12'])).resolves.toEqual({
      data: { agentsMoved: 0 },
      requested: [],
      skipped: [],
      notFound: ['11', '12'],
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('reads more than 300 agents in batches of 300 ids', async () => {
    const ids = Array.from({ length: 301 }, (_, i) => String(i + 1));
    request
      .mockResolvedValueOnce({ status: 200, data: listBody([]) })
      .mockResolvedValueOnce({ status: 200, data: listBody([inGroup('301', '70')]) })
      .mockResolvedValueOnce({ status: 200, data: { data: { agentsMoved: 1 } } });
    const result = await move(ids);
    expect(request.mock.calls[0][0].params).toEqual({
      ids: ids.slice(0, 300).join(','),
      limit: 300,
    });
    expect(request.mock.calls[1][0].params).toEqual({ ids: '301', limit: 1 });
    expect(request.mock.calls[2][0].data).toEqual({ filter: { ids: ['301'] } });
    expect(result).toEqual(
      expect.objectContaining({ requested: ['301'], skipped: [], notFound: ids.slice(0, 300) })
    );
  });

  it('fails clearly when SentinelOne moved 0 of the requested agents', async () => {
    request
      .mockResolvedValueOnce({ status: 200, data: listBody([inGroup('11', '70')]) })
      .mockResolvedValueOnce({ status: 200, data: { data: { agentsMoved: 0 } } });
    await expect(move()).rejects.toThrow(
      'SentinelOne did not apply moveAgent to 11: SentinelOne moved 0 agents'
    );
  });

  it('accepts the 204 response with no body that the API reference documents', async () => {
    request
      .mockResolvedValueOnce({ status: 200, data: listBody([inGroup('11', '70')]) })
      .mockResolvedValueOnce({ status: 204, data: '' });
    await expect(move()).resolves.toEqual({ requested: ['11'], skipped: [], notFound: [] });
  });
});
