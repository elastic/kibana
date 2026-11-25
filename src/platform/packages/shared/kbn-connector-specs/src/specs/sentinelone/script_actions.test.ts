/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timers } from './client';
import { SentinelOne } from './sentinelone';
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
    'getRemoteScripts',
    {
      osTypes: ['windows'],
      scriptType: ['action'],
      additionalFilters: vendorParams([['sortBy', 'scriptName']]),
    },
    {
      method: 'GET',
      path: '/remote-scripts',
      params: vendorParams([
        ['osTypes', 'windows'],
        ['scriptType', 'action'],
        ['sortBy', 'scriptName'],
      ]),
    },
  ],
  [
    'executeScript',
    {
      agentUuids: ['uuid-1'],
      scriptId: '91',
      taskDescription: 'Collect logs',
      scriptRuntimeTimeoutSeconds: 3600,
    },
    {
      method: 'POST',
      path: '/remote-scripts/execute',
      data: {
        filter: { uuids: ['uuid-1'] },
        data: {
          scriptId: '91',
          taskDescription: 'Collect logs',
          scriptRuntimeTimeoutSeconds: 3600,
          outputDestination: 'SentinelCloud',
        },
      },
    },
  ],
  [
    'getRemoteScriptStatus',
    { parentTaskId: '55', statuses: ['completed', 'failed'] },
    {
      method: 'GET',
      path: '/remote-scripts/status',
      params: { parentTaskId: '55', status: 'completed,failed' },
    },
  ],
  [
    'getRemoteScriptResults',
    { taskIds: ['61'], computerNames: ['host-1'] },
    {
      method: 'POST',
      path: '/remote-scripts/fetch-files',
      data: { data: { taskIds: ['61'], computerNames: ['host-1'] } },
    },
  ],
];

describe('request shapes', () => {
  it.each(REQUEST_CASES)('%s sends the documented request', expectDocumentedRequest);

  it.each(['executeScript', 'runScriptAndWait'])(
    '%s offers no SingularityXDR output and never sends its URL, keyword or API key',
    async (name) => {
      const target = { agentIds: ['11'], scriptId: '91', taskDescription: 'Collect' };
      const { input } = SentinelOne.actions[name];
      expect(() => input.parse({ ...target, outputDestination: 'SingularityXDR' })).toThrow();
      for (const dest of ['SentinelCloud', 'Local', 'None']) {
        expect(() => input.parse({ ...target, outputDestination: dest })).not.toThrow();
      }
      request.mockResolvedValue({ status: 200, data: { data: { pending: true } } });
      await run(name, {
        ...target,
        singularityxdrUrl: 'https://collector.example.com',
        singularityxdrKeyword: 'keyword',
        apiKey: 'xdr-api-key',
      });
      const sent = JSON.stringify(request.mock.calls[0][0].data);
      expect(sent).not.toContain('collector.example.com');
      expect(sent).not.toContain('keyword');
      expect(sent).not.toContain('xdr-api-key');
      expect(request.mock.calls[0][0].data).toEqual({
        filter: { ids: ['11'] },
        data: { scriptId: '91', taskDescription: 'Collect', outputDestination: 'SentinelCloud' },
      });
    }
  );
});

describe('runScriptAndWait', () => {
  const script = { agentIds: ['11'], scriptId: '91', taskDescription: 'Collect', waitSeconds: 10 };

  it('polls the status until every task is final, then returns the links', async () => {
    request
      .mockResolvedValueOnce({ status: 200, data: { data: { affected: 1, parentTaskId: '55' } } })
      .mockResolvedValueOnce({ status: 200, data: listBody([{ id: '61', status: 'in_progress' }]) })
      .mockResolvedValueOnce({ status: 200, data: listBody([{ id: '61', status: 'completed' }]) })
      .mockResolvedValueOnce({
        status: 200,
        data: { data: { data: { downloadLinks: [{ taskId: '61', downloadUrl: 'https://x/1' }] } } },
      });
    await expect(run('runScriptAndWait', script)).resolves.toEqual({
      parentTaskId: '55',
      pending: false,
      pendingExecutionId: null,
      timedOut: false,
      tasks: [{ id: '61', status: 'completed' }],
      downloadLinks: [{ taskId: '61', downloadUrl: 'https://x/1' }],
    });
    expect(request.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        url: `${API}/remote-scripts/status`,
        params: { parentTaskId: '55', limit: 1000 },
      })
    );
    expect(timers.sleep).toHaveBeenCalledWith(5000);
  });

  it('returns timedOut with the parentTaskId when tasks are still running', async () => {
    request
      .mockResolvedValueOnce({ status: 200, data: { data: { affected: 1, parentTaskId: '55' } } })
      .mockResolvedValue({ status: 200, data: listBody([{ id: '61', status: 'in_progress' }]) });
    const result = await run('runScriptAndWait', script);
    expect(result).toEqual(expect.objectContaining({ parentTaskId: '55', timedOut: true }));
    expect(request).toHaveBeenCalledTimes(3);
  });

  describe('with a simulated clock', () => {
    let now: number;
    beforeEach(() => {
      now = 0;
      jest.spyOn(Date, 'now').mockImplementation(() => now);
      jest.spyOn(timers, 'sleep').mockImplementation(async (ms: number) => {
        now += ms;
      });
    });
    const launched = { status: 200, data: { data: { affected: 1, parentTaskId: '55' } } };
    const slowStatus = () => {
      now += 1000; // each status request takes 1 s
      return Promise.resolve({
        status: 200,
        data: listBody([{ id: '61', status: 'in_progress' }]),
      });
    };

    it('bounds the wait by elapsed time, including the time of the status requests', async () => {
      request.mockResolvedValueOnce(launched).mockImplementation(slowStatus);
      const result = await run('runScriptAndWait', { ...script, waitSeconds: 10 });
      expect(result).toEqual(
        expect.objectContaining({
          parentTaskId: '55',
          timedOut: true,
          // the tasks seen by the status read at 5 s are kept when the budget ends before another read
          tasks: [{ id: '61', status: 'in_progress' }],
        })
      );
      expect((timers.sleep as jest.Mock).mock.calls).toEqual([[5000], [4000]]);
      expect(now).toBe(10_000);
      // the status request gets the remaining budget as its timeout
      expect(request.mock.calls[1][0]).toEqual(expect.objectContaining({ timeout: 5000 }));
    });

    it('returns timedOut, not an error, when a status request is cut by the remaining budget', async () => {
      request.mockResolvedValueOnce(launched).mockImplementation((config: { timeout: number }) => {
        if (config.timeout < 60_000) {
          now += config.timeout;
          return Promise.reject(
            Object.assign(new Error('timeout exceeded'), {
              isAxiosError: true,
              code: 'ECONNABORTED',
            })
          );
        }
        return slowStatus();
      });
      const result = await run('runScriptAndWait', { ...script, waitSeconds: 12 });
      expect(result).toEqual(expect.objectContaining({ parentTaskId: '55', timedOut: true }));
    });

    it('still fails on a status request error that is not caused by the budget', async () => {
      request
        .mockResolvedValueOnce(launched)
        .mockRejectedValueOnce(
          httpError(401, { errors: [{ code: 4010010, title: 'Unauthorized' }] })
        );
      await expect(run('runScriptAndWait', { ...script, waitSeconds: 12 })).rejects.toThrow(
        'Status code: 401'
      );
    });

    it('waits 100 seconds by default', async () => {
      request.mockResolvedValueOnce(launched).mockImplementation(slowStatus);
      const { agentIds, scriptId, taskDescription } = script;
      const result = await run('runScriptAndWait', { agentIds, scriptId, taskDescription });
      expect(result).toEqual(expect.objectContaining({ timedOut: true }));
      expect(now).toBe(100_000);
    });
  });

  it('reads every status page before deciding that the run is finished', async () => {
    request
      .mockResolvedValueOnce({ status: 200, data: { data: { affected: 2, parentTaskId: '55' } } })
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([{ id: '61', status: 'completed' }], 'c2'),
      })
      .mockResolvedValueOnce({ status: 200, data: listBody([{ id: '62', status: 'in_progress' }]) })
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([{ id: '61', status: 'completed' }], 'c2'),
      })
      .mockResolvedValueOnce({ status: 200, data: listBody([{ id: '62', status: 'completed' }]) })
      .mockResolvedValueOnce({ status: 200, data: { data: { data: { downloadLinks: [] } } } });
    const result = await run('runScriptAndWait', { ...script, waitSeconds: 30 });
    expect(result).toEqual(
      expect.objectContaining({
        timedOut: false,
        tasks: [
          { id: '61', status: 'completed' },
          { id: '62', status: 'completed' },
        ],
      })
    );
    expect(request.mock.calls[2][0]).toEqual(
      expect.objectContaining({ params: { parentTaskId: '55', limit: 1000, cursor: 'c2' } })
    );
    expect(request).toHaveBeenCalledTimes(6);
  });

  it('stops reading status pages when the cursor does not move, without duplicate tasks', async () => {
    request
      .mockResolvedValueOnce({ status: 200, data: { data: { affected: 1, parentTaskId: '55' } } })
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([{ id: '61', status: 'completed' }], 'same'),
      })
      .mockResolvedValueOnce({
        status: 200,
        data: listBody([{ id: '61', status: 'completed' }], 'same'),
      })
      .mockResolvedValueOnce({ status: 200, data: { data: { data: { downloadLinks: [] } } } });
    const result = await run('runScriptAndWait', { ...script, waitSeconds: 30 });
    expect(result).toEqual(
      expect.objectContaining({ timedOut: false, tasks: [{ id: '61', status: 'completed' }] })
    );
    expect(request).toHaveBeenCalledTimes(4);
  });

  it('does not poll a pending execution that needs approval', async () => {
    request.mockResolvedValueOnce({
      status: 200,
      data: { data: { affected: 1, parentTaskId: null, pending: true, pendingExecutionId: 'p1' } },
    });
    await expect(run('runScriptAndWait', script)).resolves.toEqual(
      expect.objectContaining({ pending: true, pendingExecutionId: 'p1', parentTaskId: null })
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
});
