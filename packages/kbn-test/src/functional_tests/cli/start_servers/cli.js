/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLog } from '@kbn/dev-utils';
import { startServers } from '../../tasks';
import { runCli } from '../../lib';
import { processOptions, displayHelp } from './args';
import { getTimeReporter } from '../../../kbn';

/**
 * Start servers
 * @param {string} defaultConfigPath Optional path to config
 *                                   if no config option is passed
 */
export async function startServersCli(defaultConfigPath) {
  const runStartTime = Date.now();
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });
  const reportTime = getTimeReporter(log);

  await runCli(displayHelp, async (userOptions) => {
    const options = processOptions(userOptions, defaultConfigPath);
    await startServers({
      ...options,
      runStartTime,
      reportTime,
    });
  });
}
