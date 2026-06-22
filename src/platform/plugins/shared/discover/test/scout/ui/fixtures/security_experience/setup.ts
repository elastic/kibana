/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutParallelWorkerFixtures, ScoutTestConfig, SpaceSolutionView } from '@kbn/scout';
import { SECURITY_DATA_VIEWS, SECURITY_KBN_ARCHIVE, SECURITY_TIME_RANGE } from './constants';

interface SetupOptions {
  /** Solution view to apply to the space. Defaults to `security` so the security profile resolves. */
  solutionView?: SpaceSolutionView;
}

/**
 * Prepare a space for the Security-in-Discover tests: set the security solution view (so the
 * security root profile resolves), import the data views + saved search, and default Discover to the
 * alerts data view / synthetic time window. The synthetic ES indices are created once in global
 * setup (see ../../parallel_tests/global.setup.ts).
 */
export async function setupSecurityExperience(
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace'],
  config: ScoutTestConfig,
  options: SetupOptions = {}
) {
  const { solutionView = 'security' } = options;

  // On serverless the project type fixes the solution view; only stateful spaces can be switched.
  if (!config.serverless) {
    await scoutSpace.setSolutionView(solutionView);
  }

  await scoutSpace.savedObjects.load(SECURITY_KBN_ARCHIVE);
  await scoutSpace.uiSettings.setDefaultIndex(SECURITY_DATA_VIEWS.ALERTS);
  await scoutSpace.uiSettings.setDefaultTime({
    from: SECURITY_TIME_RANGE.from,
    to: SECURITY_TIME_RANGE.to,
  });
}

export async function teardownSecurityExperience(
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace']
) {
  await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
  await scoutSpace.savedObjects.cleanStandardList();
}
