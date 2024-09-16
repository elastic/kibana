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
}) {
  outputFolder = outputFolder || join(REPO_ROOT, '.es');
  const logFiles: string[] = [];

  if (!nodeNames) {
    const { stdout: nodeNamesString } = await execa('docker', [
      'ps',
      '-a',
      '--format',
      '{{.Names}}',
    ]);
    nodeNames = nodeNamesString.split('\n').filter(Boolean);
  }

  if (!nodeNames.length) {
    log.info('No Docker nodes found to extract logs from');
    return;
  } else {
    log.info(`Attempting to extract logs from Docker nodes to ${outputFolder}`);
  }

  for (const name of nodeNames) {
    const { stdout: nodeId } = await execa('docker', [
      'ps',
      '-a',
      '--quiet',
      '--filter',
      `name=${name}`,
    ]);
    if (!nodeId) {
      continue;
    }

    const { stdout } = await execa('docker', ['logs', name]);
    const targetFile = `${name}-${nodeId}.log`;
    const targetPath = join(outputFolder, targetFile);

    await Fsp.writeFile(targetPath, stdout);
    logFiles.push(targetFile);

    log.info(`Archived logs for ${name} to ${targetPath}`);
  }

  return logFiles;
}
