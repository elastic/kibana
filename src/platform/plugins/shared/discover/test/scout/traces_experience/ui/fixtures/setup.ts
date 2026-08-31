/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutParallelWorkerFixtures, ScoutTestConfig, SpaceSolutionView } from '@kbn/scout';
import { TRACES } from './constants';

interface SetupOptions {
  solutionView?: SpaceSolutionView;
}

export async function setupTracesExperience(
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace'],
  config: ScoutTestConfig,
  options: SetupOptions = {}
) {
  const { solutionView = 'oblt' } = options;

  if (!config.serverless) {
    await scoutSpace.setSolutionView(solutionView);
  }

  await scoutSpace.savedObjects.load(TRACES.KBN_ARCHIVE);
  await scoutSpace.uiSettings.setDefaultIndex(TRACES.DATA_VIEW_NAME);
  await scoutSpace.uiSettings.setDefaultTime({
    from: TRACES.DEFAULT_START_TIME,
    to: TRACES.DEFAULT_END_TIME,
  });
}

export async function teardownTracesExperience(
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace']
) {
  await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
  await scoutSpace.savedObjects.cleanStandardList();
}
