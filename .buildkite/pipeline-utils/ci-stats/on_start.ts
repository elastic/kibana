/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { execSync } from 'child_process';
import { CiStatsClient } from './client';

const ciStats = new CiStatsClient();

export async function onStart() {
  const build = await ciStats.createBuild();
  execSync(`buildkite-agent meta-data set ci_stats_build_id "${build.id}"`);
  await ciStats.addGitInfo(build.id);
}
