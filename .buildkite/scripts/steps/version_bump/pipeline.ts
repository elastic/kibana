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
      // TODO: add more file changes.
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/bump_package_json_versions.yml')
      );

      // TODO: this should only be on main.
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/bump_versions_json.yml'));

      // Step 4: Wait, then trigger DRA builds for both snapshot and staging (synchronous)
      // TODO: we have cases where we only do DRA snapshot and not staging, if the branch is main we only run DRA snapshot, otheerwise we run
      // both.
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_snapshot.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_staging.yml'));

      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/reconcile_pr_labels.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/update_label_color.yml'));
    }

    if (BUMP_TYPE === 'minor') {
      // Step 1: Trigger ES build and promote on main (synchronous)
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/trigger_es_build_and_promote.yml', false)
      );

      // Step 2: Wait for ES build, then bump package.json on main
      pipeline.push('  - wait');
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/bump_package_json_versions_main.yml')
      );

      // Step 3: Wait, then bump versions.json and .backportrc.json on main
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/bump_versions_json.yml'));

      // Step 4: Wait, then create the new release branch off main
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/create_new_branch.yml'));

      // Step 5: Wait, then trigger DRA snapshot and staging on main (synchronous),
      //         and update the release branch config (remove CODEOWNERS, set branch field)
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_snapshot.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_staging.yml'));

      // TODO: just update the branch in the package.json
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/update_release_branch.yml'));

      // TODO: add step for doing something like this in new branch: https://github.com/elastic/kibana/pull/246793 only done on main

      // Step 4: Wait, then trigger DRA builds for both snapshot and staging (synchronous)
      // TODO: we have cases where we only do DRA snapshot and not staging, if the branch is main we only run DRA snapshot, otheerwise we run
      // both.
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_snapshot.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_staging.yml'));

      // Step 6: Wait, then ensure the version label exists for the new version
      pipeline.push('  - wait');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/ensure_version_label.yml'));
    }

    emitPipeline(pipeline);
  } catch (ex) {
    console.error('Error while generating the pipeline steps: ' + ex.message, ex);
    process.exit(1);
  }
})();
