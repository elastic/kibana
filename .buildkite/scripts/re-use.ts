/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { execSync } from 'child_process';
import { BuildkiteClient } from '#pipeline-utils';

const client = new BuildkiteClient();

(async () => {
  const build = await client.getBuild(
    process.env.BUILDKITE_PIPELINE_SLUG ?? '',
    process.env.BUILDKITE_BUILD_NUMBER ?? '',
    true
  );

  const nextJob = build.jobs.find((job) => job.state === 'waiting');
  console.log('Doing work...');
  await new Promise((resolve) => setTimeout(resolve, 10000));
  console.log('Starting next job');
  execSync(`buildkite-agent start --acquire-job ${nextJob?.id}`);
  console.log('Waiting 10s');
  await new Promise((resolve) => setTimeout(resolve, 10000));
})();
