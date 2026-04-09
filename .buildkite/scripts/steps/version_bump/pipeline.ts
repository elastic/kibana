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

      // Step 2: Wait for ES build to complete, then bump package.json and other files on the release branch
      pipeline.push('  - wait');
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/bump_package_json_versions.yml')
      );
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/bump_versions_json.yml'));

      // Step 3: Wait, then trigger DRA builds for both snapshot and staging (async).
      // If branch is main, we only run DRA snapshot, otherwise we run them both.
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_snapshot.yml'));

      if (process.env.BRANCH !== 'main') {
        pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_staging.yml'));
      }

      // Step 4: Update the labels for PRs and the color of the label itself
      pipeline.push('  - wait');

      // TODO: Ask Tiago if we can guarentee that the next label exists.
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/update_label_color.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/reconcile_pr_labels.yml'));
    }

    if (BUMP_TYPE === 'minor') {
      // Step 1: Trigger ES build and promote
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/trigger_es_build_and_promote.yml', false)
      );

      // Step 2: Wait for ES build to complete, then bump package.json and other files on the main branch.
      pipeline.push('  - wait');
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/bump_package_json_versions_to_main.yml')
      );
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/bump_versions_json.yml'));

      // Step 3: Wait, then create the new release branch off main
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/create_new_branch.yml'));

      // Step 4: Wait, and then do a bunch of file changes in the new branch.
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/update_release_branch.yml'));

      // This job only works on the main branch.
      // TODO: Ask Tiago about the ordering of this.
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/update_pipeline_resource_definitions.yml')
      );

      // Step 5: Wait, then trigger DRA snapshot and staging on main (synchronous),
      // If branch is main, we only run DRA snapshot, otherwise we run them both.
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_snapshot.yml'));

      if (process.env.BRANCH !== 'main') {
        pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_staging.yml'));
      }

      // Step 6: Wait, then ensure the version label exists for the new version and reconcile labels
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/ensure_version_label.yml'));

      // Step 7: Wait, then reconcile labels
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/reconcile_pr_labels.yml'));
    }

    emitPipeline(pipeline);
  } catch (ex) {
    console.error('Error while generating the pipeline steps: ' + ex.message, ex);
    process.exit(1);
  }
})();
