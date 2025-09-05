/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { exit } from 'process';
import type { ServerHandles } from '../types';
import { startServers, stopServers } from '../servers';

export function checkSavedObjects(fix: boolean) {
  run(async ({ log }) => {
    let serverHandles: ServerHandles | undefined;
    log.info(`Starting ES + Kibana to capture current SO type definitions`);
    serverHandles = await startServers();

    try {


    } finally {
      try {
        log.info(`Stopping ES + Kibana after the verifications`);
        await stopServers({ log, serverHandles });
      } catch(err) {
        log.warning('There was a problem stopping the services used for the Saved Objects checks', err);
        exit(0);
      }
    }
  }
}
