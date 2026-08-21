/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutParallelWorkerFixtures, ScoutTestConfig, SpaceSolutionView } from '@kbn/scout';
import { LOGS } from './constants';

interface SetupOptions {
  /** Solution view to apply to the space. Defaults to `oblt` so the logs profile resolves. */
  solutionView?: SpaceSolutionView;
}

/**
 * Prepare a space for the logs-in-Discover tests: set the observability solution view (so the
 * logs data source profile resolves) and default Discover to the synthetic time window. The
 * synthetic indices are created once in global setup (see ../parallel_tests/global.setup.ts).
 */
export async function setupLogsExperience(
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace'],
  config: ScoutTestConfig,
  options: SetupOptions = {}
) {
  const { solutionView = 'oblt' } = options;

  if (!config.serverless) {
    await scoutSpace.setSolutionView(solutionView);
  }

  await scoutSpace.uiSettings.setDefaultTime({
    from: LOGS.DEFAULT_START_TIME,
    to: LOGS.DEFAULT_END_TIME,
  });
}

export async function teardownLogsExperience(
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace']
) {
  await scoutSpace.uiSettings.unset('timepicker:timeDefaults');
  await scoutSpace.savedObjects.cleanStandardList();
}
