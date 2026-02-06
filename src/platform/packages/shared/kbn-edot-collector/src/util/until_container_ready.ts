/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { backOff } from 'exponential-backoff';
import execa from 'execa';
import type { ToolingLog } from '@kbn/tooling-log';

export async function untilContainerReady({
  containerName,
  dockerComposeFilePath,
  signal,
  log,
  condition,
}: {
  containerName: string;
  dockerComposeFilePath: string;
  signal: AbortSignal;
  log: ToolingLog;
  condition: [string, string];
}) {
  async function isContainerReady() {
    log.debug(`Checking container is ready`);
    const { stdout: globalScopeContainerName } = await execa.command(
      `docker compose -f ${dockerComposeFilePath} ps -q ${containerName}`
    );

    const [field, value] = condition;

    const { stdout } = await execa
      .command(`docker inspect --format='{{${field}}}' ${globalScopeContainerName}`)
      .catch((error) => {
        const errorMsg = error.stderr?.split('\n')[0] || error.message;
        log.debug(`Error retrieving container status: ${errorMsg}`);
        throw error;
      });

    log.debug(`Container status: ${stdout}`);

    if (stdout !== `'${value}'`) {
      throw new Error(`${containerName} not ${value}: ${stdout}`);
    }
  }

  return await backOff(isContainerReady, {
    delayFirstAttempt: true,
    startingDelay: 500,
    jitter: 'full',
    numOfAttempts: 20,
    retry: () => {
      return !signal.aborted;
    },
  });
}
