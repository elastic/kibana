/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { BuildkiteClient, BuildkiteTriggerStep } from '#pipeline-utils';

const DRY_RUN = !!process.env.DRY_RUN?.match(/^(true|1)$/i);
const buildkite = new BuildkiteClient();

async function main() {
  const commitSha = process.env.OVERRIDE_COMMIT || process.env.BUILDKITE_COMMIT;

  if (!isCurrentHeadInMain(commitSha!)) {
    if (DRY_RUN) {
      console.log(
        `DRY_RUN: Commit ${commitSha} isn't in main, triggering container build :green_heart:`
      );
    } else {
      console.log(`Commit ${commitSha} isn't in main, triggering container build :green_heart:`);
      uploadTriggerBuildStep(commitSha!);
    }
  } else {
    if (DRY_RUN) {
      console.log(`DRY_RUN: Commit ${commitSha} is in main, no build necessary :yellow_heart:`);
    } else {
      console.log(`Commit ${commitSha} is in main, no trigger necessary :yellow_heart:`);
    }
  }
}

function isCurrentHeadInMain(commitSha: string) {
  const containmentTest = execSync(
    `git branch -r --contains '${commitSha}' | grep -E "(upstream|origin)/main" | wc -l`
  ).toString();

  return parseInt(containmentTest, 10) >= 1;
}

function uploadTriggerBuildStep(commitSha: string) {
  const triggerStep: BuildkiteTriggerStep = {
    label: ':point_right: Trigger emergency commit container build',
    trigger: 'kibana-artifacts-container-image',
    build: {
      message: `Triggered by '${process.env.BUILDKITE_PIPELINE_NAME || 'unknown'}'`,
      branch: process.env?.BUILDKITE_BRANCH || 'main',
      commit: commitSha,
      env: {},
    },
  };

  buildkite.uploadSteps([triggerStep]);
}

main()
  .then(() => {
    console.log('Trigger container build step uploaded.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
