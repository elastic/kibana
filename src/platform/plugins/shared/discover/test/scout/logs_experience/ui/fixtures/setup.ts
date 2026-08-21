/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutParallelWorkerFixtures, ScoutTestConfig } from '@kbn/scout';
import { LOGS } from './constants';

/** Per-worker setup for the logs experience specs. */
export const setupLogsExperience = async (
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace'],
  config: ScoutTestConfig
) => {
  // The oblt root profile contributes the ad-hoc "All logs" data view. Serverless project
  // type already fixes the solution view, so setting it there is both unnecessary and denied.
  if (!config.serverless) {
    await scoutSpace.setSolutionView('oblt');
  }

  await scoutSpace.uiSettings.setDefaultTime({
    from: LOGS.DEFAULT_START_TIME,
    to: LOGS.DEFAULT_END_TIME,
  });
};

/** Per-worker teardown for the logs experience specs. */
export const teardownLogsExperience = async (
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace']
) => {
  await scoutSpace.uiSettings.unset('timepicker:timeDefaults');
  await scoutSpace.savedObjects.cleanStandardList();
};
