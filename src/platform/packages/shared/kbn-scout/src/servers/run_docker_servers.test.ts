/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DockerServerSpec } from '@kbn/test-docker-servers';
import { runDockerServer } from '@kbn/test-docker-servers';
import { ToolingLog } from '@kbn/tooling-log';
import type { Config } from './configs';
import { runDockerServers } from './run_docker_servers';

jest.mock('@kbn/test-docker-servers', () => ({
  ...jest.requireActual('@kbn/test-docker-servers'),
  runDockerServer: jest.fn(),
}));

const runDockerServerMock = runDockerServer as jest.Mock;
const log = new ToolingLog({ level: 'silent', writeTo: process.stdout });

const configWith = (dockerServers: Record<string, DockerServerSpec> | undefined) =>
  ({ get: (key: string) => (key === 'dockerServers' ? dockerServers : undefined) } as Config);

const spec = (enabled: boolean) => ({
  enabled,
  image: 'image:tag',
  port: 6104,
  portInContainer: 8080,
});

describe('runDockerServers', () => {
  beforeEach(() => {
    runDockerServerMock.mockReset();
  });

  it('does nothing when no docker server is enabled', async () => {
    const stop = await runDockerServers({
      config: configWith({ registry: spec(false) }),
      log,
    });
    await stop();

    expect(runDockerServerMock).not.toHaveBeenCalled();
  });

  it('does nothing when the config has no docker servers', async () => {
    const stop = await runDockerServers({ config: configWith(undefined), log });
    await stop();

    expect(runDockerServerMock).not.toHaveBeenCalled();
  });

  it('starts the enabled servers and stops them all', async () => {
    const stopRegistry = jest.fn();
    const stopOther = jest.fn();
    runDockerServerMock.mockImplementation(async (server) => ({
      name: server.name,
      stop: server.name === 'registry' ? stopRegistry : stopOther,
    }));

    const stop = await runDockerServers({
      config: configWith({ registry: spec(true), other: spec(true), disabled: spec(false) }),
      log,
    });

    expect(runDockerServerMock.mock.calls.map(([server]) => server.name)).toEqual([
      'registry',
      'other',
    ]);
    expect(runDockerServerMock.mock.calls[0][0]).toMatchObject({ url: 'http://localhost:6104' });

    await stop();
    expect(stopRegistry).toHaveBeenCalledTimes(1);
    expect(stopOther).toHaveBeenCalledTimes(1);
  });

  it('stops the servers that started when another one fails', async () => {
    const stopRegistry = jest.fn();
    runDockerServerMock.mockImplementation(async (server) => {
      if (server.name === 'broken') {
        throw new Error('no such image');
      }
      return { name: server.name, stop: stopRegistry };
    });

    await expect(
      runDockerServers({ config: configWith({ registry: spec(true), broken: spec(true) }), log })
    ).rejects.toThrow('no such image');

    expect(stopRegistry).toHaveBeenCalledTimes(1);
  });

  it('aborts the other starts as soon as one fails', async () => {
    const abortedSignals: string[] = [];
    runDockerServerMock.mockImplementation(async (server, { signal }) => {
      if (server.name === 'broken') {
        throw new Error('no such image');
      }
      await new Promise<void>((resolve) => {
        signal.addEventListener('abort', () => {
          abortedSignals.push(server.name);
          resolve();
        });
      });
      const error = new Error('start aborted');
      error.name = 'AbortError';
      throw error;
    });

    await expect(
      runDockerServers({ config: configWith({ slow: spec(true), broken: spec(true) }), log })
    ).rejects.toThrow('no such image');

    expect(abortedSignals).toEqual(['slow']);
  });

  it('surfaces the startup failure even when stopping the other servers fails too', async () => {
    runDockerServerMock.mockImplementation(async (server) => {
      if (server.name === 'broken') {
        throw new Error('no such image');
      }
      return { name: server.name, stop: jest.fn().mockRejectedValue(new Error('kill failed')) };
    });

    await expect(
      runDockerServers({ config: configWith({ registry: spec(true), broken: spec(true) }), log })
    ).rejects.toThrow('no such image');
  });

  it('reports which server failed to stop', async () => {
    runDockerServerMock.mockImplementation(async (server) => ({
      name: server.name,
      stop:
        server.name === 'registry'
          ? jest.fn().mockRejectedValue(new Error('kill failed'))
          : jest.fn(),
    }));
    const stop = await runDockerServers({
      config: configWith({ registry: spec(true), other: spec(true) }),
      log,
    });

    await expect(stop()).rejects.toThrow('kill failed');
  });

  it('forwards an unexpected container exit to onEarlyExit', async () => {
    runDockerServerMock.mockImplementation(async (server, { onUnexpectedExit }) => {
      onUnexpectedExit(new Error('exited with code 137'));
      return { name: server.name, stop: jest.fn() };
    });
    const onEarlyExit = jest.fn();

    await runDockerServers({ config: configWith({ registry: spec(true) }), log, onEarlyExit });

    expect(onEarlyExit).toHaveBeenCalledWith(
      '[docker:registry] container exited unexpectedly: exited with code 137'
    );
  });
});
