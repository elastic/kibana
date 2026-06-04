/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutParallelWorkerFixtures } from '@kbn/scout';
import * as testData from './constants';

/**
 * Standard Discover space setup: loads the saved objects archive and sets the
 * default index and time range. This is the baseline most Discover specs need to
 * render the `logstash-*` data view with data, so prefer this single call over
 * repeating the three steps in every `beforeAll` (the same load/setDefaultIndex/
 * setDefaultTime trio is duplicated across the core and metrics_experience specs,
 * and mirrors the suite-level `before()` hook from the most FTR tests).
 *
 * Not for the tests, which deliberately skip the default index/time setup.
 */
export async function setupDiscoverDefaults(scoutSpace: ScoutParallelWorkerFixtures['scoutSpace']) {
  await scoutSpace.savedObjects.load(testData.DISCOVER_KBN_ARCHIVE);
  await scoutSpace.uiSettings.setDefaultIndex(testData.DEFAULT_DATA_VIEW);
  await scoutSpace.uiSettings.setDefaultTime(testData.DEFAULT_TIME_RANGE);
}

/**
 * Reverts {@link setupDiscoverDefaults}: clears the default index/time ui settings
 * and removes the saved objects loaded into the space.
 */
export async function teardownDiscoverDefaults(
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace']
) {
  await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
  await scoutSpace.savedObjects.cleanStandardList();
}
