/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';

import { initLogsDir } from '@kbn/test';

import { startServers, parseServerFlags, SERVER_FLAG_OPTIONS } from '../servers';

/**
 * Start servers
 */
export function startServersCli() {
  run(
    async ({ flagsReader: flags, log }) => {
      const options = parseServerFlags(flags);

      if (options.logsDir) {
        initLogsDir(log, options.logsDir);
      }

      await startServers(log, options);
    },
    {
      flags: SERVER_FLAG_OPTIONS,
    }
  );
}
