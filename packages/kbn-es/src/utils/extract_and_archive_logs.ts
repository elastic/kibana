/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';
import Fsp from 'fs/promises';

/**
 * Extracts logs from Docker nodes, writes them to files, and returns the file paths.
 * @param log
 * @param nodeNames
 */
export async function extractAndArchiveLogs({
  log,
  nodeNames,
}: {
  log: ToolingLog;
  nodeNames: string[];
}) {
  const logFiles: string[] = [];
  for (const name of nodeNames) {
    const { stdout: nodeId } = await execa('docker', [
      'ps',
      '-a',
      '--quiet',
      '--filter',
      `name=${name}`,
    ]);
    const { stdout } = await execa('docker', ['logs', name]);
    const targetFile = `${name}-${nodeId}.log`;

    await Fsp.writeFile(targetFile, stdout);
    logFiles.push(targetFile);

    log.info(`Archived logs for ${name} to ${name}-${nodeId}.log`);
  }

  return logFiles;
}
