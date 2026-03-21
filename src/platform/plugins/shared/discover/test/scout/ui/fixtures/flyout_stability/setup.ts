/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutParallelWorkerFixtures } from '@kbn/scout';
import { LOGSTASH } from './constants';

export async function setupFlyoutStability(scoutSpace: ScoutParallelWorkerFixtures['scoutSpace']) {
  await scoutSpace.savedObjects.load(LOGSTASH.KBN_ARCHIVE);
  await scoutSpace.uiSettings.setDefaultIndex(LOGSTASH.DATA_VIEW_NAME);
  await scoutSpace.uiSettings.setDefaultTime({
    from: LOGSTASH.DEFAULT_START_TIME,
    to: LOGSTASH.DEFAULT_END_TIME,
  });
}

export async function teardownFlyoutStability(
  scoutSpace: ScoutParallelWorkerFixtures['scoutSpace']
) {
  await scoutSpace.uiSettings.unset('defaultIndex', 'timepicker:timeDefaults');
  await scoutSpace.savedObjects.cleanStandardList();
}
