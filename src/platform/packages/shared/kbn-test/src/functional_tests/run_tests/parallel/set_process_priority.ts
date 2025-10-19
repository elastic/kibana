/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile } from 'child_process';
import type { ExecFileOptions } from 'child_process';
import os from 'os';
import { promisify } from 'util';

type Priority = 'high' | 'medium' | 'low';

interface PriorityConfig {
  nice: number;
  cpuShares: number;
}

interface PortResolution {
  pid?: number;
  containerIds: string[];
}

interface DockerPortEntry {
  containerId: string;
  portsInfo: string;
}

const execFileAsync = promisify(execFile);

const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 15_000;

const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  high: { nice: -5, cpuShares: 2_048 },
  medium: { nice: 0, cpuShares: 1_024 },
  low: { nice: 10, cpuShares: 512 },
};

const DOCKER_UNSUPPORTED_PLATFORMS = new Set(['win32']);
const DOCKER_PORT_SEPARATOR = '->';

export async function setProcessPriority(
  { ports, pids }: { ports: number[]; pids: number[] },
  priority: Priority
): Promise<void> {
  const resolvedProcessIds = new Set<number>(pids);
  const resolvedContainerIds = new Set<string>();

  for (const port of ports) {
    const resolution = await resolvePort(port);

    if (resolution.pid !== undefined) {
      resolvedProcessIds.add(resolution.pid);
    }

    resolution.containerIds.forEach((containerId) => {
      resolvedContainerIds.add(containerId);
    });
  }

  await applyPriorityToProcesses(resolvedProcessIds, PRIORITY_CONFIG[priority]);
  await applyPriorityToDockerContainers(resolvedContainerIds, PRIORITY_CONFIG[priority]);
}

// Resolve the process ID and potential docker container that expose the given port.
async function resolvePort(port: number): Promise<PortResolution> {
  const portResolution: PortResolution = { containerIds: [] };

  portResolution.pid = await pollForPid(port);
  portResolution.containerIds = await resolveDockerContainers(port);

  return portResolution;
}

// Poll until a process exposes the target port, returning undefined on timeout.
async function pollForPid(port: number): Promise<number | undefined> {
  const startTime = Date.now();

  while (Date.now() - startTime < POLL_TIMEOUT_MS) {
    const pid = await resolvePidForPort(port);
    if (pid !== undefined) {
      return pid;
    }

    await delay(POLL_INTERVAL_MS);
  }

  return undefined;
}

// Perform a single lookup for the process that is listening on the port.
async function resolvePidForPort(port: number): Promise<number | undefined> {
  try {
    const { stdout } = await execFileWithOptionalSudo('lsof', [
      '-nP',
      `-iTCP:${port}`,
      '-sTCP:LISTEN',
      '-Fp',
    ]);

    const output = toUtf8String(stdout);

    const pidLine = output
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.startsWith('p'));

    if (!pidLine) {
      return undefined;
    }

    const parsedPid = Number(pidLine.slice(1));
    return Number.isFinite(parsedPid) ? parsedPid : undefined;
  } catch (error) {
    return undefined;
  }
}

// Locate docker containers exposing the port so we can adjust their CPU shares.
async function resolveDockerContainers(port: number): Promise<string[]> {
  if (DOCKER_UNSUPPORTED_PLATFORMS.has(os.platform())) {
    return [];
  }

  try {
    const { stdout } = await execFileWithOptionalSudo('docker', [
      'ps',
      '--format',
      '{{.ID}} {{.Ports}}',
    ]);
    const stdoutText = toUtf8String(stdout);

    const parsedEntries = stdoutText
      .split('\n')
      .map((line) => line.trim())
      .filter((line): line is string => line.length > 0)
      .map(parseDockerPortsLine)
      .filter((entry): entry is DockerPortEntry => entry !== undefined);

    return parsedEntries
      .filter((entry) => entry.portsInfo.includes(`:${port}${DOCKER_PORT_SEPARATOR}`))
      .map((entry) => entry.containerId);
  } catch (error) {
    return [];
  }
}

// Apply the configured niceness to every target process without restarting them.
async function applyPriorityToProcesses(
  processIds: Set<number>,
  priorityConfig: PriorityConfig
): Promise<void> {
  await Promise.all(
    Array.from(processIds).map(async (processId) => {
      try {
        os.setPriority(processId, priorityConfig.nice);
        return;
      } catch (error) {
        if (isPermissionError(error)) {
          try {
            await execFileWithOptionalSudo('renice', [
              '-n',
              priorityConfig.nice.toString(),
              '-p',
              processId.toString(),
            ]);
            return;
          } catch (reniceError) {
            const reniceMessage =
              reniceError instanceof Error ? reniceError.message : 'Failed to run renice command';
            process.stderr.write(
              `Unable to adjust priority for pid ${processId} using renice: ${reniceMessage}\n`
            );
            return;
          }
        }

        const message = error instanceof Error ? error.message : 'Failed to set process priority';
        process.stderr.write(`Unable to adjust priority for pid ${processId}: ${message}\n`);
      }
    })
  );
}

// Adjust CPU shares for docker containers without forcing a restart.
async function applyPriorityToDockerContainers(
  containerIds: Set<string>,
  priorityConfig: PriorityConfig
): Promise<void> {
  if (containerIds.size === 0) {
    return;
  }

  if (DOCKER_UNSUPPORTED_PLATFORMS.has(os.platform())) {
    return;
  }

  await Promise.all(
    Array.from(containerIds).map(async (containerId) => {
      try {
        await execFileWithOptionalSudo('docker', [
          'update',
          '--cpu-shares',
          priorityConfig.cpuShares.toString(),
          containerId,
        ]);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to update docker container priorities';
        process.stderr.write(
          `Unable to adjust CPU shares for container ${containerId}: ${message}\n`
        );
      }
    })
  );
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

function toUtf8String(output: Buffer | string): string {
  return typeof output === 'string' ? output : output.toString('utf8');
}

function parseDockerPortsLine(line: string): DockerPortEntry | undefined {
  const firstSpaceIdx = line.indexOf(' ');

  if (firstSpaceIdx === -1) {
    return undefined;
  }

  const containerId = line.slice(0, firstSpaceIdx).trim();
  const portsInfo = line.slice(firstSpaceIdx + 1).trim();

  if (!containerId) {
    return undefined;
  }

  return { containerId, portsInfo };
}

async function execFileWithOptionalSudo(
  command: string,
  args: string[],
  options: ExecFileOptions = {}
) {
  try {
    return await execFileAsync(command, args, options);
  } catch (error) {
    if (!shouldRetryWithSudo(error) || !canUseSudo()) {
      throw error;
    }

    return execFileAsync('sudo', [command, ...args], options);
  }
}

function canUseSudo(): boolean {
  if (typeof process.getuid !== 'function') {
    return false;
  }

  return process.getuid() !== 0;
}

function shouldRetryWithSudo(error: unknown): boolean {
  if (isPermissionError(error)) {
    return true;
  }

  if (error && typeof error === 'object') {
    const stderr = getErrorStream(error, 'stderr');
    const stdout = getErrorStream(error, 'stdout');

    const hasPermissionMessage =
      stderr.includes('permission denied') || stdout.includes('permission denied');

    if (hasPermissionMessage) {
      return canUseSudo();
    }
  }

  return false;
}

function isPermissionError(error: unknown): error is NodeJS.ErrnoException {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as NodeJS.ErrnoException;

  return err.code === 'EACCES' || err.code === 'EPERM';
}

function getErrorStream(error: unknown, key: 'stdout' | 'stderr'): string {
  if (!error || typeof error !== 'object') {
    return '';
  }

  const stream = (error as Record<string, unknown>)[key];

  if (typeof stream === 'string') {
    return stream.toLowerCase();
  }

  if (Buffer.isBuffer(stream)) {
    return stream.toString('utf8').toLowerCase();
  }

  return '';
}
