/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import type { ToolingLog } from '@kbn/tooling-log';
import { startDockerServers } from './run_docker_servers';
import type { Config } from './configs';

jest.mock('execa');

const execaMock = execa as jest.MockedFunction<typeof execa>;

const createMockLog = (): jest.Mocked<ToolingLog> =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  } as unknown as jest.Mocked<ToolingLog>);

const createMockConfig = (dockerServers: Record<string, any>): Config =>
  ({
    get: jest.fn((key: string) => {
      if (key === 'dockerServers') return dockerServers;
      throw new Error(`Unexpected config key: ${key}`);
    }),
  } as unknown as Config);

const registrySpec = {
  enabled: true,
  image: 'docker.elastic.co/kibana-ci/package-registry-distribution:lite',
  portInContainer: 8080,
  port: 6104,
  args: ['-v', '/some/path:/package-registry/config.yml'],
  waitForLogLine: 'package manifests loaded',
  waitForLogLineTimeoutMs: 5000,
  preferCached: true,
};

interface MockProc {
  stdout: { on: jest.Mock };
  stderr: { on: jest.Mock };
  kill: jest.Mock;
  catch: jest.Mock;
}

const createMockLogsProcess = (logLine: string): MockProc => {
  const proc: MockProc = {
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    kill: jest.fn(),
    catch: jest.fn(),
  };
  proc.catch.mockReturnValue(proc);
  proc.stdout.on.mockImplementation((_event: string, handler: (data: Buffer) => void) => {
    process.nextTick(() => handler(Buffer.from(logLine)));
  });
  return proc;
};

describe('startDockerServers', () => {
  let log: jest.Mocked<ToolingLog>;

  beforeEach(() => {
    jest.clearAllMocks();
    log = createMockLog();
  });

  it('returns a no-op shutdown when no docker servers are configured', async () => {
    const config = createMockConfig({});
    const shutdown = await startDockerServers(config, log);

    expect(log.debug).toHaveBeenCalledWith('scout: no docker servers enabled, skipping');
    expect(execaMock).not.toHaveBeenCalled();

    await shutdown();
  });

  it('returns a no-op shutdown when all docker servers are disabled', async () => {
    const config = createMockConfig({
      registry: { ...registrySpec, enabled: false },
    });
    const shutdown = await startDockerServers(config, log);

    expect(log.debug).toHaveBeenCalledWith('scout: no docker servers enabled, skipping');
    expect(execaMock).not.toHaveBeenCalled();

    await shutdown();
  });

  it('skips pull when preferCached is true and image exists locally', async () => {
    execaMock.mockImplementation(((cmd: string, args: string[]) => {
      const command = `${cmd} ${args[0]}`;
      if (command === 'docker images') {
        return Promise.resolve({ stdout: 'abc123\n' });
      }
      if (command === 'docker run') {
        return Promise.resolve({ stdout: 'container-id-abc123' });
      }
      if (command === 'docker logs') {
        return createMockLogsProcess('package manifests loaded');
      }
      return Promise.resolve({ stdout: '' });
    }) as any);

    const config = createMockConfig({ registry: registrySpec });
    const shutdown = await startDockerServers(config, log);

    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('skipping pull'));
    expect(execaMock).not.toHaveBeenCalledWith('docker', ['pull', registrySpec.image]);

    await shutdown();
  });

  it('pulls image when it is not cached locally', async () => {
    execaMock.mockImplementation(((cmd: string, args: string[]) => {
      const command = `${cmd} ${args[0]}`;
      if (command === 'docker images') {
        return Promise.resolve({ stdout: '' });
      }
      if (command === 'docker pull') {
        return Promise.resolve({ stdout: '' });
      }
      if (command === 'docker run') {
        return Promise.resolve({ stdout: 'container-id-abc123' });
      }
      if (command === 'docker logs') {
        return createMockLogsProcess('package manifests loaded');
      }
      return Promise.resolve({ stdout: '' });
    }) as any);

    const config = createMockConfig({ registry: registrySpec });
    await startDockerServers(config, log);

    expect(execaMock).toHaveBeenCalledWith('docker', ['pull', registrySpec.image]);
  });

  it('runs container with correct docker args', async () => {
    execaMock.mockImplementation(((cmd: string, args: string[]) => {
      const command = `${cmd} ${args[0]}`;
      if (command === 'docker images') {
        return Promise.resolve({ stdout: 'cached' });
      }
      if (command === 'docker run') {
        return Promise.resolve({ stdout: 'container-id-xyz789' });
      }
      if (command === 'docker logs') {
        return createMockLogsProcess('package manifests loaded');
      }
      return Promise.resolve({ stdout: '' });
    }) as any);

    const config = createMockConfig({ registry: registrySpec });
    await startDockerServers(config, log);

    expect(execaMock).toHaveBeenCalledWith('docker', [
      'run',
      '-dit',
      ...registrySpec.args,
      '-p',
      `${registrySpec.port}:${registrySpec.portInContainer}`,
      registrySpec.image,
    ]);
  });

  it('wraps port conflict error with helpful message', async () => {
    execaMock.mockImplementation(((cmd: string, args: string[]) => {
      const command = `${cmd} ${args[0]}`;
      if (command === 'docker images') {
        return Promise.resolve({ stdout: 'cached' });
      }
      if (command === 'docker run') {
        const error: any = new Error('port is already allocated');
        error.exitCode = 125;
        return Promise.reject(error);
      }
      return Promise.resolve({ stdout: '' });
    }) as any);

    const config = createMockConfig({ registry: registrySpec });

    await expect(startDockerServers(config, log)).rejects.toThrow(/port 6104 is already in use/);
  });

  it('shutdown function kills the container', async () => {
    execaMock.mockImplementation(((cmd: string, args: string[]) => {
      const command = `${cmd} ${args[0]}`;
      if (command === 'docker images') {
        return Promise.resolve({ stdout: 'cached' });
      }
      if (command === 'docker run') {
        return Promise.resolve({ stdout: 'container-id-shutdown-test' });
      }
      if (command === 'docker logs') {
        return createMockLogsProcess('package manifests loaded');
      }
      if (command === 'docker kill') {
        return Promise.resolve({ stdout: '' });
      }
      if (command === 'docker rm') {
        return Promise.resolve({ stdout: '' });
      }
      return Promise.resolve({ stdout: '' });
    }) as any);

    const config = createMockConfig({ registry: registrySpec });
    const shutdown = await startDockerServers(config, log);

    await shutdown();

    expect(execaMock).toHaveBeenCalledWith('docker', ['kill', 'container-id-shutdown-test']);
  });

  it('shutdown gracefully handles already-stopped containers', async () => {
    execaMock.mockImplementation(((cmd: string, args: string[]) => {
      const command = `${cmd} ${args[0]}`;
      if (command === 'docker images') {
        return Promise.resolve({ stdout: 'cached' });
      }
      if (command === 'docker run') {
        return Promise.resolve({ stdout: 'container-gone' });
      }
      if (command === 'docker logs') {
        return createMockLogsProcess('package manifests loaded');
      }
      if (command === 'docker kill') {
        return Promise.reject(new Error('No such container: container-gone'));
      }
      return Promise.resolve({ stdout: '' });
    }) as any);

    const config = createMockConfig({ registry: registrySpec });
    const shutdown = await startDockerServers(config, log);

    await expect(shutdown()).resolves.toBeUndefined();
  });
});
