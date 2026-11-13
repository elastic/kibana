/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BuildkiteClient, emitPipeline, getPipeline } from '#pipeline-utils';

const BUMP_TYPE = process.env.WORKFLOW;

if (!BUMP_TYPE) {
  console.error(
    'WORKFLOW environment variable is not set. Please set it to either "patch" or "minor".'
  );
  process.exit(1);
}

// The centralized release workflow is sometimes re-triggered while an earlier bump for the same
// version is still running; two builds then race on the same branches and PRs. The oldest build
// wins, so retrying a step in it is never blocked by a newer duplicate.
const assertNoConcurrentBump = async () => {
  const { BUILDKITE_PIPELINE_SLUG, BUILDKITE_BUILD_NUMBER, NEW_VERSION, DRY_RUN } = process.env;
  if (DRY_RUN === 'true' || !BUILDKITE_PIPELINE_SLUG || !BUILDKITE_BUILD_NUMBER || !NEW_VERSION) {
    return;
  }

  let builds;
  try {
    builds = await new BuildkiteClient().getInProgressBuilds(BUILDKITE_PIPELINE_SLUG);
  } catch (ex) {
    // The check is a guard, not a prerequisite: don't fail the bump when Buildkite's API is unavailable.
    console.warn(`Skipping concurrent version bump check: ${ex.message}`);
    return;
  }

  const currentBuildNumber = Number(BUILDKITE_BUILD_NUMBER);
  const olderDuplicate = builds.find(
    ({ number, env }) =>
      number < currentBuildNumber && env.NEW_VERSION === NEW_VERSION && env.DRY_RUN !== 'true'
  );

  if (olderDuplicate) {
    throw new Error(
      `build #${olderDuplicate.number} is already bumping to ${NEW_VERSION}: ${olderDuplicate.web_url}. ` +
        'Let it finish (or cancel it) before starting another bump for this version.'
    );
  }
};

(async () => {
  const pipeline: string[] = [];
  try {
    await assertNoConcurrentBump();

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
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_staging.yml'));

      // Step 4: Update the labels for PRs and the color of the label itself
      pipeline.push('  - wait # before update label color');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/update_label_color.yml'));

      // Step 5: Reconcile labels
      pipeline.push('  - wait # before reconcile labels');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/reconcile_pr_labels.yml'));
    }

    if (BUMP_TYPE === 'minor') {
      // Step 1: Trigger ES build and promote
      pipeline.push(
        getPipeline(
          '.buildkite/pipelines/version_bump/trigger_es_build_and_promote_on_main.yml',
          false
        )
      );

      // Step 2: Wait for ES build to complete, then update versions.json on main.
      // NOTE: package.json bump on main happens after branch creation (step 4) so the
      // new release branch is cut while main is still at the release version.
      pipeline.push('  - wait # after es build and promote on main');

      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/update_pipeline_resource_definitions.yml')
      );
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/bump_versions_json.yml'));

      // Step 3: Wait, then create the new release branch off main
      pipeline.push('  - wait # before create new branch');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/create_new_branch.yml'));

      // Step 4: Wait, and then do a bunch of file changes in the new branch.
      pipeline.push('  - wait # before update release branch');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/update_release_branch.yml'));

      // Step 5: Wait, then trigger DRA snapshot and staging on the new release branch.
      pipeline.push('  - wait # before dra snapshot/staging on release branch');
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_snapshot.yml'));
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/trigger_dra_staging.yml'));

      // Step 6: Wait, then bump main's package.json to the next dev version. This runs
      // after release-branch setup is complete so update_release_branch is not coupled to
      // the PR-merge wait inside bump_package_json_versions_to_main (up to 2 hours).
      pipeline.push('  - wait # before package.json bump on main');
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/bump_package_json_versions_to_main.yml')
      );

      // Step 7: Wait, then trigger DRA snapshot on main. Runs after the package.json bump
      // so the snapshot build picks up the correct next-dev version (e.g. 9.6.0).
      pipeline.push('  - wait # before dra snapshot on main');
      pipeline.push(
        getPipeline('.buildkite/pipelines/version_bump/trigger_dra_snapshot_on_main.yml')
      );
      pipeline.push(getPipeline('.buildkite/pipelines/version_bump/ensure_version_label.yml'));
    }

    emitPipeline(pipeline);
  } catch (ex) {
    console.error('Error while generating the pipeline steps: ' + ex.message, ex);
    process.exit(1);
  }
})();
