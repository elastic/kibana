/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../lib/inspector', () => ({
  createSession: () => ({ post: jest.fn(), disconnect: jest.fn() }),
}));

import { NEVER, Subject } from 'rxjs';
import { ReservedPrivilegesSet } from '@kbn/core/server';
import { httpServerMock, httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { API_BASE_PATH } from '../../common';
import { ProfileRunner, type ProfileRunners } from '../lib/profile_runner';
import { registerRoutes } from '.';

const profile = { nodes: [], startTime: 0, endTime: 1 };

function createRunner(type: 'cpu' | 'memory') {
  const commands = {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(profile),
  };
  return { commands, runner: new ProfileRunner(type, commands) };
}

function setup() {
  const router = httpServiceMock.createRouter();
  const cpu = createRunner('cpu');
  const memory = createRunner('memory');
  const runners: ProfileRunners = { cpu: cpu.runner, memory: memory.runner };
  registerRoutes(router, loggingSystemMock.createLogger(), runners);

  const routes = [
    ...router.get.mock.calls.map(([config]) => ({ method: 'get', config })),
    ...router.post.mock.calls.map(([config]) => ({ method: 'post', config })),
  ];

  async function callGet(path: string, request = httpServerMock.createKibanaRequest()) {
    const call = router.get.mock.calls.find(([config]) => config.path === path);
    if (!call) {
      throw new Error(`No get route registered for ${path}`);
    }
    const response = httpServerMock.createResponseFactory();
    await call[1]({} as never, request, response);
    return response;
  }

  async function callPost(path: string) {
    const call = router.post.mock.calls.find(([config]) => config.path === path);
    if (!call) {
      throw new Error(`No post route registered for ${path}`);
    }
    const response = httpServerMock.createResponseFactory();
    await call[1]({} as never, httpServerMock.createKibanaRequest(), response);
    return response;
  }

  return { routes, callGet, callPost, cpu, memory };
}

function createAbortableRequest(duration: number) {
  const aborted$ = new Subject<void>();
  const request = httpServerMock.createKibanaRequest({ query: { duration } });
  Object.defineProperty(request, 'events', { value: { aborted$, completed$: NEVER } });
  return { request, aborted$ };
}

async function flushPromises() {
  await new Promise(setImmediate);
}

describe('profiler routes', () => {
  it('registers the status route and the duration, start and stop routes for each type', () => {
    const { routes } = setup();
    expect(routes.map(({ method, config }) => `${method} ${config.path}`).sort()).toEqual([
      `get ${API_BASE_PATH}/cpu_profile`,
      `get ${API_BASE_PATH}/memory_profile`,
      `get ${API_BASE_PATH}/status`,
      `post ${API_BASE_PATH}/cpu_profile/start`,
      `post ${API_BASE_PATH}/cpu_profile/stop`,
      `post ${API_BASE_PATH}/memory_profile/start`,
      `post ${API_BASE_PATH}/memory_profile/stop`,
    ]);
  });

  it('requires the superuser privilege on every route', () => {
    const { routes } = setup();
    for (const { config } of routes) {
      expect(config.security).toEqual({
        authz: { requiredPrivileges: [ReservedPrivilegesSet.superuser] },
      });
    }
  });

  it('reports which profiles are running', async () => {
    const { callGet, cpu } = setup();
    await cpu.runner.start();

    const response = await callGet(`${API_BASE_PATH}/status`);
    expect(response.ok).toHaveBeenCalledWith({
      body: { cpu: { isRunning: true }, memory: { isRunning: false } },
    });
  });

  it('returns the profile as a downloadable file when stopped', async () => {
    const { callPost } = setup();
    await callPost(`${API_BASE_PATH}/memory_profile/start`);

    const response = await callPost(`${API_BASE_PATH}/memory_profile/stop`);
    expect(response.ok).toHaveBeenCalledWith({
      body: profile,
      headers: {
        'content-type': 'application/json',
        'content-disposition': expect.stringMatching(
          /^attachment; filename="kibana-memory-profile-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.heapprofile"$/
        ),
      },
    });
  });

  it('returns a conflict when starting a profile that is already running', async () => {
    const { callPost } = setup();
    await callPost(`${API_BASE_PATH}/cpu_profile/start`);

    const response = await callPost(`${API_BASE_PATH}/cpu_profile/start`);
    expect(response.conflict).toHaveBeenCalledWith({
      body: { message: 'A cpu profile is already running' },
    });
  });

  it('returns a conflict when stopping a profile that is not running', async () => {
    const { callPost } = setup();

    const response = await callPost(`${API_BASE_PATH}/cpu_profile/stop`);
    expect(response.conflict).toHaveBeenCalledWith({
      body: { message: 'No cpu profile is running' },
    });
  });

  it('returns a server error when the profiler fails', async () => {
    const { callPost, cpu } = setup();
    cpu.commands.start.mockRejectedValueOnce(new Error('boom'));

    const response = await callPost(`${API_BASE_PATH}/cpu_profile/start`);
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'boom' },
    });
  });

  it('discards a timed capture when the client disconnects', async () => {
    const { callGet, cpu } = setup();
    const { request, aborted$ } = createAbortableRequest(60);

    const capture = callGet(`${API_BASE_PATH}/cpu_profile`, request);
    await flushPromises();
    expect(cpu.runner.isRunning()).toBe(true);
    expect(aborted$.observed).toBe(true);

    aborted$.next();
    await capture;

    expect(cpu.runner.isRunning()).toBe(false);
    expect(cpu.commands.stop).not.toHaveBeenCalled();
    expect(aborted$.observed).toBe(false);

    await cpu.runner.start();
    expect(cpu.runner.isRunning()).toBe(true);
  });
});
