/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CiStatsClient } from './client';

const ciStats = new CiStatsClient();

export async function onMetricsViable() {
  if (!process.env.CI_STATS_BUILD_ID) {
    return;
  }

  console.log('Marking build as a "valid baseline" so that it can be used to power PR reports');
  await ciStats.markBuildAsValidBaseline(process.env.CI_STATS_BUILD_ID);
}
