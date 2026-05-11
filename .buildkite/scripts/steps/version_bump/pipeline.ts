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

if (!BUMP_TYPE) {
  console.error(
    'WORKFLOW environment variable is not set. Please set it to either "patch" or "minor".'
  );
  process.exit(1);
}

(async () => {
  const pipeline: string[] = [];
  try {
    if (BUMP_TYPE === 'patch') {
      // Step 1: Trigger ES build and promote (synchronous)
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/trigger_es_build_and_promote.yml', false)
      );

      // Step 2: Wait for ES build to complete, then bump package.json and other files on the release branch
      pipeline.push('  - wait # after es build and promote');
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/bump_package_json_versions.yml')
      );
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/bump_versions_json.yml'));

      // Step 3: Wait, then trigger DRA snapshot (async).
      pipeline.push('  - wait # before dra snapshot');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_snapshot.yml'));

      // Step 4: Update the labels for PRs and the color of the label itself
      pipeline.push('  - wait # before update label color');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/update_label_color.yml'));
    }

    if (BUMP_TYPE === 'minor') {
      // Step 1: Trigger ES build and promote
      pipeline.push(
        getPipeline(
          '.buildkite/pipelines/version_bump/trigger_es_build_and_promote_on_main.yml',
          false
        )
      );

      // Step 2: Wait for ES build to complete, then bump package.json and other files on the main branch.
      pipeline.push('  - wait # after es build and promote on main');
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/bump_package_json_versions_to_main.yml')
      );
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/bump_versions_json.yml'));

      // Step 3: Wait, then create the new release branch off main
      pipeline.push('  - wait # before create new branch');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/create_new_branch.yml'));

      // Step 4: Wait, then trigger DRA snapshot and staging on the new release branch,
      // If branch is main, we only run DRA snapshot, otherwise we run them both.
      pipeline.push('  - wait # before dra snapshot/staging on release branch');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_snapshot.yml'));
      if (process.env.BRANCH !== 'main') {
        pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_staging.yml'));
      }

      // Step 5: Wait, and then do a bunch of file changes in the new branch.
      pipeline.push('  - wait # before update release branch');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/update_release_branch.yml'));

      // Step 6: Update pipeline resource definitions on main.
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/update_pipeline_resource_definitions.yml')
      );

      // Step 7: Wait, then trigger DRA snapshot on main,
      pipeline.push('  - wait # before dra snapshot on main');
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/trigger_dra_snapshot_on_main.yml')
      );

      // Step 8: Wait, then ensure the version label exists for the new version and reconcile labels
      pipeline.push('  - wait # before ensure version label');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/ensure_version_label.yml'));
    }

    emitPipeline(pipeline);
  } catch (ex) {
    console.error('Error while generating the pipeline steps: ' + ex.message, ex);
    process.exit(1);
  }
})();
