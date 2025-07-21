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
import {
  fetchLatestBaseBranchSnapshot as fetchBaseBranchSnapshot,
  fetchLatestServerlessSnapshot,
  takeSnapshot,
  assertValidUpdates,
} from '../src/snapshots';

export function checkSavedObjectTypes(baseBranch: string) {
  run(async ({ log }) => {
    try {
      log.info(`Fetching snapshot for base branch '${baseBranch}'`);
      const baseBranchSnapshot = await fetchBaseBranchSnapshot({ log, baseBranch });
      log.info(`Fetching snapshot for current serverless release`);
      const latestServerlessSnapshot = await fetchLatestServerlessSnapshot({ log });
      log.info(`Starting ES + Kibana to capture current SO type definitions`);
      const currentSnapshot = await takeSnapshot({ log });

      log.info(`Checking SO type updates between base branch and current branch`);
      assertValidUpdates({ log, from: baseBranchSnapshot, to: currentSnapshot });
      log.info('✅ Current SO type definitions are compatible with the base branch');

      log.info(`Checking SO type updates between current serverless release and current branch`);
      assertValidUpdates({ log, from: latestServerlessSnapshot, to: currentSnapshot });
      log.info('✅ Current SO type definitions are compatible with the current serverless release');
    } catch (err) {
      log.error(err);
      exit(1);
    }
    exit(0);
  });
}
