/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { withProcRunner } from '@kbn/dev-proc-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { runDockerServers } from './run_docker_servers';
import { runElasticsearch } from './run_elasticsearch';
import { runKibanaServer } from './run_kibana_server';
import { registerServerShutdown } from './server_shutdown';
import { startServers } from './start_servers';
import type { StartServerOptions } from './flags';

jest.mock('@kbn/dev-proc-runner', () => ({ withProcRunner: jest.fn() }));
jest.mock('@kbn/ci-stats-reporter', () => ({ getTimeReporter: jest.fn(() => jest.fn()) }));
jest.mock('../common', () => ({ silence: jest.fn() }));
jest.mock('../playwright/utils', () => ({ getPlaywrightGrepTag: jest.fn(() => '@local') }));
jest.mock('./configs', () => ({
  getConfigRootDir: jest.fn(() => '/config'),
  loadServersConfig: jest.fn(async () => ({ get: jest.fn() })),
}));
jest.mock('./pre_create_security_indexes', () => ({
  preCreateSecurityIndexesViaSamlAuth: jest.fn(),
}));
jest.mock('./ensure_default_space_npre', () => ({ ensureDefaultSpaceNPRE: jest.fn() }));
jest.mock('./run_docker_servers', () => ({ runDockerServers: jest.fn() }));
jest.mock('./run_elasticsearch', () => ({ runElasticsearch: jest.fn() }));
jest.mock('./run_kibana_server', () => ({
  runKibanaServer: jest.fn(),
  getExtraKbnOpts: jest.fn(() => []),
}));
jest.mock('./server_shutdown', () => ({
  registerServerShutdown: jest.fn(),
}));

const withProcRunnerMock = withProcRunner as jest.Mock;
const runDockerServersMock = runDockerServers as jest.Mock;
const runElasticsearchMock = runElasticsearch as jest.Mock;
const runKibanaServerMock = runKibanaServer as jest.Mock;
const registerServerShutdownMock = registerServerShutdown as jest.Mock;

const log = new ToolingLog({ level: 'silent', writeTo: process.stdout });
const options = { testTarget: { location: 'local' } } as unknown as StartServerOptions;

describe('startServers', () => {
  const procs = { teardown: jest.fn().mockResolvedValue(undefined), waitForAllToStop: jest.fn() };
  const stopDockerServers = jest.fn();
  const shutdownEs = jest.fn();
  const removeShutdownHook = jest.fn();
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    jest.clearAllMocks();
    procs.teardown.mockResolvedValue(undefined);
    withProcRunnerMock.mockImplementation(async (_log, fn) => fn(procs));
    runDockerServersMock.mockResolvedValue(stopDockerServers);
    runElasticsearchMock.mockResolvedValue(shutdownEs);
    runKibanaServerMock.mockResolvedValue(undefined);
    registerServerShutdownMock.mockReturnValue(removeShutdownHook);
  });

  // `onEarlyExit` sets `process.exitCode`; left set, it would fail the jest worker itself.
  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('starts the docker servers and Elasticsearch before Kibana, and stops everything once the servers exit', async () => {
    await startServers(log, options);

    const kibanaStart = runKibanaServerMock.mock.invocationCallOrder[0];
    expect(runDockerServersMock.mock.invocationCallOrder[0]).toBeLessThan(kibanaStart);
    expect(runElasticsearchMock.mock.invocationCallOrder[0]).toBeLessThan(kibanaStart);
    expect(runElasticsearchMock).toHaveBeenCalledWith(
      expect.objectContaining({ onEarlyExit: expect.any(Function) })
    );
    // Kibana exiting is how start-server ends; it is not an early exit
    expect(runKibanaServerMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ onEarlyExit: expect.anything() })
    );
    expect(procs.waitForAllToStop).toHaveBeenCalledTimes(1);
    expect(shutdownEs).toHaveBeenCalledTimes(1);
    expect(stopDockerServers).toHaveBeenCalledTimes(1);
    expect(removeShutdownHook).toHaveBeenCalledTimes(1);
  });

  it('stops the docker servers when Elasticsearch fails to start', async () => {
    runElasticsearchMock.mockRejectedValue(new Error('es down'));

    await expect(startServers(log, options)).rejects.toThrow('es down');

    expect(stopDockerServers).toHaveBeenCalledTimes(1);
    expect(shutdownEs).not.toHaveBeenCalled();
  });

  it('stops Elasticsearch and the docker servers when Kibana fails to start', async () => {
    runKibanaServerMock.mockRejectedValue(new Error('kibana down'));

    await expect(startServers(log, options)).rejects.toThrow('kibana down');

    expect(shutdownEs).toHaveBeenCalledTimes(1);
    expect(stopDockerServers).toHaveBeenCalledTimes(1);
    expect(removeShutdownHook).toHaveBeenCalledTimes(1);
  });

  it('keeps the startup error when the shutdown after it fails too', async () => {
    runKibanaServerMock.mockRejectedValue(new Error('kibana down'));
    stopDockerServers.mockRejectedValueOnce(new Error('docker rm failed'));

    await expect(startServers(log, options)).rejects.toThrow('kibana down');
  });

  it('registers the signal hook before anything starts and stops a container that is still starting', async () => {
    let shutdownHook: () => Promise<void> = async () => {};
    registerServerShutdownMock.mockImplementation((_procs, hook, onSignal) => {
      // what exit-hook does on a signal: mark it, tear the managed processes down, run the hook
      shutdownHook = async () => {
        onSignal?.();
        await procs.teardown('SIGTERM');
        await hook();
      };
      return removeShutdownHook;
    });
    const containersStopped = jest.fn();
    // the docker start only settles once it is aborted, like a readiness wait cut short by a signal
    runDockerServersMock.mockImplementation(
      ({ signal }) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => {
            containersStopped();
            const error = new Error('[docker:registry] start aborted');
            error.name = 'AbortError';
            reject(error);
          });
        })
    );

    const pending = startServers(log, options);
    await new Promise((resolve) => setImmediate(resolve));
    expect(registerServerShutdownMock).toHaveBeenCalledTimes(1);
    expect(runKibanaServerMock).not.toHaveBeenCalled();

    await shutdownHook();
    expect(containersStopped).toHaveBeenCalledTimes(1);

    // an interrupted start is not a failure to report: exit-hook exits with the signal's code
    await expect(pending).resolves.toBeUndefined();
    expect(process.exitCode).toBe(130);
    expect(runKibanaServerMock).not.toHaveBeenCalled();
    // Elasticsearch was starting alongside; it is waited for and stopped too
    expect(shutdownEs).toHaveBeenCalledTimes(1);
    expect(removeShutdownHook).toHaveBeenCalledTimes(1);
  });

  it('stops the Elasticsearch that was starting alongside when a docker server fails to start', async () => {
    runDockerServersMock.mockRejectedValue(new Error('no such image'));

    await expect(startServers(log, options)).rejects.toThrow('no such image');

    expect(shutdownEs).toHaveBeenCalledTimes(1);
    expect(runKibanaServerMock).not.toHaveBeenCalled();
  });

  it('reports the container exit, not the Kibana start it interrupts', async () => {
    let onEarlyExit: (msg: string) => void = () => {};
    runDockerServersMock.mockImplementation(async ({ onEarlyExit: handler }) => {
      onEarlyExit = handler;
      return stopDockerServers;
    });
    runKibanaServerMock.mockImplementation(async () => {
      onEarlyExit('[docker:registry] container exited unexpectedly: exit code 137');
      throw new Error('kibana exited before it was ready');
    });

    await expect(startServers(log, options)).rejects.toThrow(
      '[docker:registry] container exited unexpectedly: exit code 137'
    );
    expect(stopDockerServers).toHaveBeenCalledTimes(1);
    expect(shutdownEs).toHaveBeenCalledTimes(1);
  });

  it('does not hang when a backing service exits while Kibana is still booting', async () => {
    let dockerEarlyExit: (msg: string) => void = () => {};
    runDockerServersMock.mockImplementation(async ({ onEarlyExit }) => {
      dockerEarlyExit = onEarlyExit;
      return stopDockerServers;
    });
    // like ProcRunner.run() once a teardown is in progress: never settles
    runKibanaServerMock.mockImplementation(
      () =>
        new Promise<void>(() => {
          dockerEarlyExit('[docker:registry] container exited unexpectedly: exit code 137');
        })
    );

    await expect(startServers(log, options)).rejects.toThrow(
      '[docker:registry] container exited unexpectedly: exit code 137'
    );
    expect(procs.teardown).toHaveBeenCalledWith('SIGTERM');
    expect(stopDockerServers).toHaveBeenCalledTimes(1);
    expect(shutdownEs).toHaveBeenCalledTimes(1);
  });

  it('shuts the servers down when a docker server exits on its own', async () => {
    let onEarlyExit: (msg: string) => void = () => {};
    runDockerServersMock.mockImplementation(async ({ onEarlyExit: handler }) => {
      onEarlyExit = handler;
      return stopDockerServers;
    });
    procs.waitForAllToStop.mockImplementation(async () => {
      onEarlyExit('[docker:registry] container exited unexpectedly');
    });

    // the exit is reported as the run's failure, not swallowed by the normal shutdown
    await expect(startServers(log, options)).rejects.toThrow(
      '[docker:registry] container exited unexpectedly'
    );

    expect(procs.teardown).toHaveBeenCalledWith('SIGTERM');
    expect(shutdownEs).toHaveBeenCalledTimes(1);
    expect(stopDockerServers).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);
  });

  it('treats an Elasticsearch exit caused by the signal as part of the interrupt', async () => {
    let shutdownHook: () => Promise<void> = async () => {};
    registerServerShutdownMock.mockImplementation((_procs, hook, onSignal) => {
      // what exit-hook does on a signal: mark it, tear the managed processes down, run the hook
      shutdownHook = async () => {
        onSignal?.();
        await procs.teardown('SIGTERM');
        await hook();
      };
      return removeShutdownHook;
    });
    let esEarlyExit: (msg: string) => void = () => {};
    runElasticsearchMock.mockImplementation(async ({ onEarlyExit }) => {
      esEarlyExit = onEarlyExit;
      return shutdownEs;
    });
    procs.waitForAllToStop.mockImplementation(async () => {
      // a terminal Ctrl-C: the hook fires, then the ES JVM (which got the signal too) exits
      await shutdownHook();
      esEarlyExit('ES exitted unexpectedly');
    });

    await expect(startServers(log, options)).resolves.toBeUndefined();
    expect(process.exitCode).toBe(130);
  });
});
