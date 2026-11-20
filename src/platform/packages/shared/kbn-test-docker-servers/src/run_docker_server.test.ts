/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PassThrough } from 'stream';
import execa from 'execa';
import { ToolingLog } from '@kbn/tooling-log';
import { runDockerServer, toDockerServer } from './run_docker_server';

jest.mock('execa', () => jest.fn());

const execaMock = execa as unknown as jest.Mock;

interface FakeDocker {
  calls: string[][];
  stdout: PassThrough;
  stderr: PassThrough;
  /** Simulates the container exiting on its own with the given code. */
  exitContainer: (code: number) => void;
  /** Replace the `docker pull` child process, e.g. with one that only settles when killed. */
  pullProc?: Promise<{ stdout: string }> & { kill: () => void };
  /** Simulates a terminal Ctrl-C reaching the `docker wait` monitor itself (exit code 130). */
  interruptMonitor: () => void;
  /** Simulates `docker wait` failing for a reason other than the container exiting. */
  failMonitor: () => void;
  /** What `docker inspect` reports for the container's running state. */
  inspectRunning: boolean;
}

function fakeDocker({
  cached,
  killError,
}: {
  cached: boolean;
  /** Make `docker kill` fail with this message, e.g. because the container already exited. */
  killError?: string;
}): FakeDocker {
  const calls: string[][] = [];
  const stdout = new PassThrough();
  const stderr = new PassThrough();

  let resolveWait: (value: { stdout: string }) => void = () => {};
  let rejectWait: (error: unknown) => void = () => {};
  const waitProc = Object.assign(
    new Promise<{ stdout: string }>((resolve, reject) => {
      resolveWait = resolve;
      rejectWait = reject;
    }),
    { kill: () => rejectWait(Object.assign(new Error('killed'), { killed: true })) }
  );
  const interruptMonitor = () =>
    rejectWait(
      Object.assign(new Error('Command failed with exit code 130: docker wait'), { exitCode: 130 })
    );
  const failMonitor = () =>
    rejectWait(Object.assign(new Error('error during connect: EOF'), { exitCode: 1 }));
  // the runner handles this rejection; avoid an unhandled-rejection warning when nobody awaits it
  waitProc.catch(() => {});

  execaMock.mockImplementation((_cmd: string, args: string[]) => {
    calls.push(args);
    switch (args[0]) {
      case 'images':
        return Promise.resolve({ stdout: cached ? 'sha256:abc' : '' });
      case 'pull':
        return fake.pullProc ?? Object.assign(Promise.resolve({ stdout: '' }), { kill: () => {} });
      case 'rm':
        return Promise.resolve({ stdout: '' });
      case 'run':
        return Promise.resolve({ stdout: 'container-1\n' });
      case 'logs':
        return Object.assign(Promise.resolve({ stdout: '' }), { stdout, stderr });
      case 'wait':
        return waitProc;
      case 'inspect':
        return Promise.resolve({ stdout: fake.inspectRunning ? 'true\n' : 'false\n' });
      case 'kill':
        stdout.end();
        stderr.end();
        return killError ? Promise.reject(new Error(killError)) : Promise.resolve({ stdout: '' });
      default:
        throw new Error(`unexpected docker call: ${args.join(' ')}`);
    }
  });

  const fake: FakeDocker = {
    calls,
    stdout,
    stderr,
    exitContainer: (code: number) => resolveWait({ stdout: `${code}\n` }),
    interruptMonitor,
    failMonitor,
    inspectRunning: true,
  };
  return fake;
}

const server = toDockerServer('registry', {
  enabled: true,
  image: 'docker.elastic.co/package-registry/distribution:lite',
  port: 6104,
  portInContainer: 8080,
  args: ['-e', 'EPR_REQUIRE_PACKAGE_SIGNATURES=false'],
  waitForLogLine: 'package manifests loaded',
  waitForLogLineTimeoutMs: 2000,
  preferCached: true,
});

const log = new ToolingLog({ level: 'silent', writeTo: process.stdout });
const dockerCall = (calls: string[][], subcommand: string) =>
  calls.filter((args) => args[0] === subcommand);

describe('runDockerServer', () => {
  const originalCi = process.env.CI;

  beforeEach(() => {
    execaMock.mockReset();
    delete process.env.CI;
  });

  afterAll(() => {
    if (originalCi === undefined) {
      delete process.env.CI;
    } else {
      process.env.CI = originalCi;
    }
  });

  it('runs the image with the port mapping and args, and resolves once the log line shows up', async () => {
    const docker = fakeDocker({ cached: true });

    const pending = runDockerServer(server, { log });
    await new Promise((resolve) => setImmediate(resolve));
    docker.stdout.write('loading...\n');
    docker.stdout.write('package manifests loaded\n');
    const running = await pending;

    expect(dockerCall(docker.calls, 'pull')).toHaveLength(0);
    expect(dockerCall(docker.calls, 'run')).toEqual([
      [
        'run',
        '-dit',
        '-e',
        'EPR_REQUIRE_PACKAGE_SIGNATURES=false',
        '-p',
        '6104:8080',
        'docker.elastic.co/package-registry/distribution:lite',
      ],
    ]);
    expect(running).toMatchObject({
      name: 'registry',
      containerId: 'container-1',
      url: 'http://localhost:6104',
    });

    await running.stop();
  });

  it('pulls the image when it is not available locally', async () => {
    const docker = fakeDocker({ cached: false });

    const pending = runDockerServer(server, { log });
    await new Promise((resolve) => setImmediate(resolve));
    docker.stdout.write('package manifests loaded\n');
    const running = await pending;

    expect(dockerCall(docker.calls, 'pull')).toEqual([['pull', server.image]]);

    await running.stop();
  });

  it('stops and removes the container when the readiness line never shows up', async () => {
    const docker = fakeDocker({ cached: true });

    await expect(
      runDockerServer({ ...server, waitForLogLineTimeoutMs: 50 }, { log })
    ).rejects.toThrow(/didn't find a log line matching "package manifests loaded" within/);

    expect(dockerCall(docker.calls, 'kill')).toEqual([['kill', 'container-1']]);
    expect(dockerCall(docker.calls, 'rm')).toEqual([['rm', 'container-1']]);
  });

  it('fails fast when the container exits before the readiness line, without calling onUnexpectedExit', async () => {
    const docker = fakeDocker({ cached: true });
    const onUnexpectedExit = jest.fn();

    const pending = runDockerServer(
      { ...server, waitForLogLineTimeoutMs: 60_000 },
      { log, onUnexpectedExit }
    );
    await new Promise((resolve) => setImmediate(resolve));
    docker.exitContainer(1);

    await expect(pending).rejects.toThrow('unexpectedly exitted with code 1');
    expect(dockerCall(docker.calls, 'kill')).toEqual([['kill', 'container-1']]);
    expect(onUnexpectedExit).not.toHaveBeenCalled();
  });

  it('stops the container and rejects when aborted during the readiness wait', async () => {
    const docker = fakeDocker({ cached: true });
    const onUnexpectedExit = jest.fn();
    const abortCtrl = new AbortController();

    const pending = runDockerServer(
      { ...server, waitForLogLineTimeoutMs: 60_000 },
      { log, onUnexpectedExit, signal: abortCtrl.signal }
    );
    await new Promise((resolve) => setImmediate(resolve));
    abortCtrl.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(dockerCall(docker.calls, 'kill')).toEqual([['kill', 'container-1']]);
    expect(dockerCall(docker.calls, 'rm')).toEqual([['rm', 'container-1']]);
    expect(onUnexpectedExit).not.toHaveBeenCalled();
  });

  it('kills a pull in progress when aborted, and never runs the container', async () => {
    const docker = fakeDocker({ cached: false });
    const pullKilled = jest.fn();
    let rejectPull: (error: Error) => void = () => {};
    docker.pullProc = Object.assign(
      new Promise<{ stdout: string }>((_, reject) => {
        rejectPull = reject;
      }),
      {
        kill: () => {
          pullKilled();
          rejectPull(Object.assign(new Error('killed'), { killed: true }));
        },
      }
    );
    docker.pullProc.catch(() => {});
    const abortCtrl = new AbortController();

    const pending = runDockerServer(server, { log, signal: abortCtrl.signal });
    await new Promise((resolve) => setImmediate(resolve));
    abortCtrl.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(pullKilled).toHaveBeenCalledTimes(1);
    expect(dockerCall(docker.calls, 'run')).toHaveLength(0);
  });

  it('does not run the container when the signal is already aborted', async () => {
    const docker = fakeDocker({ cached: true });
    const abortCtrl = new AbortController();
    abortCtrl.abort();

    await expect(runDockerServer(server, { log, signal: abortCtrl.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(dockerCall(docker.calls, 'run')).toHaveLength(0);
  });

  it('still removes a container that had already exited when stop() runs', async () => {
    const docker = fakeDocker({
      cached: true,
      killError: 'cannot kill container: container-1: container container-1 is not running',
    });

    const pending = runDockerServer(server, { log });
    await new Promise((resolve) => setImmediate(resolve));
    docker.stdout.write('package manifests loaded\n');
    const running = await pending;

    await running.stop();

    expect(dockerCall(docker.calls, 'kill')).toEqual([['kill', 'container-1']]);
    expect(dockerCall(docker.calls, 'rm')).toEqual([['rm', 'container-1']]);
  });

  it('concurrent stop() calls wait for the same kill instead of returning early', async () => {
    const docker = fakeDocker({ cached: true });
    const pending = runDockerServer(server, { log });
    await new Promise((resolve) => setImmediate(resolve));
    docker.stdout.write('package manifests loaded\n');
    const running = await pending;

    const first = running.stop();
    const second = running.stop();
    expect(second).toBe(first);
    await Promise.all([first, second]);

    expect(dockerCall(docker.calls, 'kill')).toEqual([['kill', 'container-1']]);
  });

  it('stop() kills the container once and keeps it on CI', async () => {
    process.env.CI = 'true';
    const docker = fakeDocker({ cached: true });

    const pending = runDockerServer(server, { log });
    await new Promise((resolve) => setImmediate(resolve));
    docker.stdout.write('package manifests loaded\n');
    const running = await pending;

    await running.stop();
    await running.stop();

    expect(dockerCall(docker.calls, 'kill')).toEqual([['kill', 'container-1']]);
    expect(dockerCall(docker.calls, 'rm')).toHaveLength(0);
  });

  it('does not report a container exit when the monitor itself was interrupted by a signal', async () => {
    const docker = fakeDocker({ cached: true });
    const onUnexpectedExit = jest.fn();

    const pending = runDockerServer(server, { log, onUnexpectedExit });
    await new Promise((resolve) => setImmediate(resolve));
    docker.stdout.write('package manifests loaded\n');
    const running = await pending;

    docker.interruptMonitor();
    await new Promise((resolve) => setImmediate(resolve));
    expect(onUnexpectedExit).not.toHaveBeenCalled();

    await running.stop();
  });

  it('does not report a container exit when the monitor failed but the container is still running', async () => {
    const docker = fakeDocker({ cached: true });
    const onUnexpectedExit = jest.fn();

    const pending = runDockerServer(server, { log, onUnexpectedExit });
    await new Promise((resolve) => setImmediate(resolve));
    docker.stdout.write('package manifests loaded\n');
    const running = await pending;

    docker.failMonitor();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(onUnexpectedExit).not.toHaveBeenCalled();
    expect(dockerCall(docker.calls, 'inspect')).toHaveLength(1);

    await running.stop();
  });

  it('reports a monitor failure as an exit when the container is gone', async () => {
    const docker = fakeDocker({ cached: true });
    docker.inspectRunning = false;
    const onUnexpectedExit = jest.fn();

    const pending = runDockerServer(server, { log, onUnexpectedExit });
    await new Promise((resolve) => setImmediate(resolve));
    docker.stdout.write('package manifests loaded\n');
    const running = await pending;

    docker.failMonitor();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(onUnexpectedExit).toHaveBeenCalledTimes(1);

    await running.stop();
  });

  it('reports a container that exits on its own, but not one that was stopped', async () => {
    const docker = fakeDocker({ cached: true });
    const onUnexpectedExit = jest.fn();

    const pending = runDockerServer(server, { log, onUnexpectedExit });
    await new Promise((resolve) => setImmediate(resolve));
    docker.stdout.write('package manifests loaded\n');
    const running = await pending;

    docker.exitContainer(137);
    await new Promise((resolve) => setImmediate(resolve));
    expect(onUnexpectedExit).toHaveBeenCalledTimes(1);
    expect(onUnexpectedExit.mock.calls[0][0].message).toContain(
      'unexpectedly exitted with code 137'
    );

    await running.stop();
    expect(onUnexpectedExit).toHaveBeenCalledTimes(1);
  });
});
