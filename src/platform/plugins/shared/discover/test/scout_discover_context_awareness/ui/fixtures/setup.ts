/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutParallelWorkerFixtures } from '@kbn/scout';
import { CONTEXT_AWARENESS_KBN_ARCHIVE, CONTEXT_AWARENESS_TIME_RANGE } from './constants';

/**
 * Import the `my-example-*` data views and default Discover to the time window the context
 * awareness ES documents fall in. The matching ES indices are ingested once in global setup
 * (see ../parallel_tests/global.setup.ts).
 */
export async function setupContextAwareness(scoutSpace: ScoutParallelWorkerFixtures['scoutSpace']) {
  const importedSavedObjects = await scoutSpace.savedObjects.load(CONTEXT_AWARENESS_KBN_ARCHIVE);
  await scoutSpace.uiSettings.setDefaultTime(CONTEXT_AWARENESS_TIME_RANGE);

  return importedSavedObjects;
}

export async function teardownContextAwareness(
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace']
) {
  await scoutSpace.uiSettings.unset('timepicker:timeDefaults');
  await scoutSpace.savedObjects.cleanStandardList();
}
