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
import type { DockerServerSpec } from '@kbn/test';
import type { Config } from './configs';

interface RunningContainer {
  name: string;
  containerId: string;
}

async function isImageAvailableLocally(image: string): Promise<boolean> {
  try {
    const { stdout } = await execa('docker', ['images', '-q', image]);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

async function pullImage(name: string, spec: DockerServerSpec, log: ToolingLog): Promise<void> {
  if (spec.preferCached && (await isImageAvailableLocally(spec.image))) {
    log.info(`[docker:${name}] skipping pull, image "${spec.image}" is cached locally`);
    return;
  }

  log.info(`[docker:${name}] pulling docker image "${spec.image}"`);
  await execa('docker', ['pull', spec.image]);
}

async function runContainer(
  name: string,
  spec: DockerServerSpec,
  log: ToolingLog
): Promise<string> {
  log.info(`[docker:${name}] starting container from "${spec.image}"`);

  try {
    const dockerArgs = [
      'run',
      '-dit',
      ...(spec.args || []),
      '-p',
      `${spec.port}:${spec.portInContainer}`,
      spec.image,
    ];

    const { stdout } = await execa('docker', dockerArgs);
    const containerId = stdout.trim();
    log.info(`[docker:${name}] container started: ${containerId.substring(0, 12)}`);
    return containerId;
  } catch (error: any) {
    if (error?.exitCode === 125 && error?.message?.includes('port is already allocated')) {
      throw new Error(
        `[docker:${name}] port ${spec.port} is already in use. ` +
          `Check for leftover containers with 'docker ps' and kill them with 'docker kill <id>'.`
      );
    }
    throw error;
  }
}

async function waitForReady(
  name: string,
  containerId: string,
  spec: DockerServerSpec,
  log: ToolingLog
): Promise<void> {
  const { waitForLogLine, waitForLogLineTimeoutMs = 30_000 } = spec;

  if (!waitForLogLine) {
    log.warning(`[docker:${name}] no waitForLogLine defined, skipping readiness check`);
    return;
  }

  const label =
    waitForLogLine instanceof RegExp ? `/${waitForLogLine.source}/` : `"${waitForLogLine}"`;
  log.info(
    `[docker:${name}] waiting for log line ${label} (timeout: ${waitForLogLineTimeoutMs}ms)`
  );

  const startTime = Date.now();
  const logsProcess = execa('docker', ['logs', '-f', containerId]);

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `[docker:${name}] timed out after ${waitForLogLineTimeoutMs}ms waiting for ${label}`
          )
        );
      }, waitForLogLineTimeoutMs);

      const onData = (data: Buffer) => {
        const line = data.toString();
        const matched =
          waitForLogLine instanceof RegExp
            ? waitForLogLine.test(line)
            : line.includes(waitForLogLine);

        if (matched) {
          clearTimeout(timeout);
          log.info(`[docker:${name}] ready after ${Date.now() - startTime}ms`);
          resolve();
        }
      };

      logsProcess.stdout?.on('data', onData);
      logsProcess.stderr?.on('data', onData);

      logsProcess.catch((err) => {
        clearTimeout(timeout);
        reject(new Error(`[docker:${name}] container exited unexpectedly: ${err.message}`));
      });
    });
  } finally {
    logsProcess.kill();
  }
}

async function stopContainer(name: string, containerId: string, log: ToolingLog): Promise<void> {
  try {
    log.info(`[docker:${name}] stopping container ${containerId.substring(0, 12)}`);
    await execa('docker', ['kill', containerId]);

    if (!process.env.CI) {
      await execa('docker', ['rm', containerId]);
    }
  } catch (error: any) {
    if (
      error?.message?.includes('is not running') ||
      error?.message?.includes('No such container')
    ) {
      return;
    }
    throw error;
  }
}

/**
 * Starts all enabled Docker servers defined in the Scout config.
 * Returns a shutdown function that stops and removes the containers.
 *
 * Follows the same pattern as `runElasticsearch` -- caller is responsible
 * for invoking the returned shutdown function in a `finally` block.
 */
export async function startDockerServers(
  config: Config,
  log: ToolingLog
): Promise<() => Promise<void>> {
  const serverConfigs: Record<string, DockerServerSpec> = config.get('dockerServers');
  const enabledServers = Object.entries(serverConfigs).filter(([, spec]) => spec.enabled);

  if (enabledServers.length === 0) {
    log.debug('scout: no docker servers enabled, skipping');
    return async () => {};
  }

  const runningContainers: RunningContainer[] = [];

  for (const [name, spec] of enabledServers) {
    await pullImage(name, spec, log);
    const containerId = await runContainer(name, spec, log);
    runningContainers.push({ name, containerId });
    await waitForReady(name, containerId, spec, log);
  }

  return async () => {
    for (const { name, containerId } of runningContainers) {
      await stopContainer(name, containerId, log);
    }
  };
}
