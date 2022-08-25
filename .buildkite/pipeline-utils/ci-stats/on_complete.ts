/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BuildkiteClient } from '../buildkite';
import { CiStatsClient } from './client';

const buildkite = new BuildkiteClient();
const ciStats = new CiStatsClient();

export async function onComplete() {
  if (!process.env.CI_STATS_BUILD_ID) {
    return;
  }

  const result = buildkite.getBuildStatus(await buildkite.getCurrentBuild());
  const status = result.success ? 'SUCCESS' : 'FAILURE';
  console.log('Job Status:', result);
  await ciStats.completeBuild(status, process.env.CI_STATS_BUILD_ID);
}
