/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';

import execa from 'execa';
import Fsp from 'fs/promises';
import { join } from 'path';

import { REPO_ROOT } from '@kbn/repo-info';

/**
 * execa embeds the whole buffered `stdout`/`stderr` in `error.message`, so prefer `shortMessage`
 * to keep CI output readable.
 */
const describeError = (error: Error & { shortMessage?: string }): string =>
  error.shortMessage ?? error.message ?? String(error);

/**
 * Streams `docker logs <name>` straight into `targetPath` without buffering the output.
 */
export async function writeContainerLogsToFile(name: string, targetPath: string): Promise<void> {
  const fileHandle = await Fsp.open(targetPath, 'w');
  try {
    // Hand the child the file descriptor directly: execa only applies `maxBuffer` (100MB by
    // default) to stdio it has to buffer, and a UIAM container in DEBUG mode emits well over that.
    // The descriptor is duplicated into the child, so closing it here once the child exits is safe.
    await execa('docker', ['logs', name], {
      stdout: fileHandle.fd,
      stderr: fileHandle.fd,
      buffer: false,
    });
  } finally {
    await fileHandle.close();
  }
}

/**
 * Extracts logs from Docker nodes, writes them to files, and returns the file paths.
 */
export async function extractAndArchiveLogs({
  outputFolder,
  log,
  nodeNames,
}: {
  log: ToolingLog;
  nodeNames?: string[];
  outputFolder?: string;
}): Promise<string[]> {
  const targetFolder = outputFolder || join(REPO_ROOT, '.es');
  const logFiles: string[] = [];

  let names = nodeNames;
  if (!names) {
    try {
      const { stdout } = await execa('docker', ['ps', '-a', '--format', '{{.Names}}']);
      names = stdout.split('\n').filter(Boolean);
    } catch (error) {
      log.error(`Failed to list Docker nodes to extract logs from: ${describeError(error)}`);
      return logFiles;
    }
  }

  if (!names.length) {
    log.info('No Docker nodes found to extract logs from');
    return logFiles;
  }

  log.info(`Attempting to extract logs from Docker nodes to ${targetFolder}`);

  try {
    await Fsp.mkdir(targetFolder, { recursive: true });
  } catch (error) {
    log.error(`Failed to create the log output folder ${targetFolder}: ${describeError(error)}`);
    return logFiles;
  }

  for (const name of names) {
    // Archiving runs during shutdown, often after the real failure has already been reported. One
    // unreadable container must never fail the run, nor stop the remaining containers.
    try {
      // Anchor the filter: `name=` matches on substring, so an unanchored `name=uiam` also
      // matches `uiam-cosmosdb` and `uiam-oauth` and returns one id per line.
      const { stdout: nodeId } = await execa('docker', [
        'ps',
        '-a',
        '--quiet',
        '--filter',
        `name=^${name}$`,
      ]);
      if (!nodeId) {
        continue;
      }

      const targetFile = `${name}-${nodeId}.log`;
      const targetPath = join(targetFolder, targetFile);

      await writeContainerLogsToFile(name, targetPath);
      logFiles.push(targetFile);

      log.info(`Archived logs for ${name} to ${targetPath}`);
    } catch (error) {
      log.error(`Failed to archive logs for Docker node ${name}: ${describeError(error)}`);
    }
  }

  return logFiles;
}
