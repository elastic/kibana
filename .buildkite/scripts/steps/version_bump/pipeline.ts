/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { emitPipeline, getPipeline } from '#pipeline-utils';

const BUMP_TYPE = process.env.WORKFLOW;

(async () => {
  const pipeline: string[] = [];

  try {
    if (BUMP_TYPE === 'patch') {
      // Step 1: Trigger ES build and promote (synchronous)
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/trigger_es_build_and_promote.yml', false)
      );

      // Step 2: Wait for ES build to complete, then bump package.json on the release branch
      pipeline.push('  - wait');
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/bump_package_json_versions.yml')
      );

      // Step 3: Wait, then bump versions.json on main
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/bump_versions_json.yml'));

      // Step 4: Wait, then trigger DRA builds for both snapshot and staging (synchronous)
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_snapshot.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_staging.yml'));

      // Step 5: Wait for DRA builds, then reconcile PR labels and update label color
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/reconcile_pr_labels.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/update_label_color.yml'));
    }

    if (BUMP_TYPE === 'minor') {
      // TODO: Implement minor bump workflow
      console.error('Minor bump workflow is not yet implemented');
    }

    emitPipeline(pipeline);
  } catch (ex) {
    console.error('Error while generating the pipeline steps: ' + ex.message, ex);
    process.exit(1);
  }
})();
