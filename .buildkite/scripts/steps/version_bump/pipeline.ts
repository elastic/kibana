/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPipeline } from '#pipeline-utils';

const BUMP_TYPE = process.env.WORKFLOW;

(async () => {
  const pipeline: string[] = [];

  try {
    // Common Steps
    // Step 1: Build ES and promote
    pipeline.push(
      getPipeline('.buildkite/pipelines/version_bump/trigger_es_build_and_promote.yml', false)
    );

    // Step 2: Bump versions in package.json and x-pack/package.json
    pipeline.push('.buildkite/pipelines/version_bump/bump_versions.yml');

    if (BUMP_TYPE === 'patch') {
      console.log('Patch bump detected');
    }

    if (BUMP_TYPE === 'minor') {
      console.log('Minor bump detected');
    }
  } catch (ex) {
    console.error('Error while generating the pipeline steps: ' + ex.message, ex);
    process.exit(1);
  }
})();
