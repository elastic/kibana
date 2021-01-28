/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { startServers } from '../../tasks';
import { runCli } from '../../lib';
import { processOptions, displayHelp } from './args';

/**
 * Start servers
 * @param {string} defaultConfigPath Optional path to config
 *                                   if no config option is passed
 */
export async function startServersCli(defaultConfigPath) {
  await runCli(displayHelp, async (userOptions) => {
    const options = processOptions(userOptions, defaultConfigPath);
    await startServers(options);
  });
}
