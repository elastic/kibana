/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { execSync } from 'child_process';
import { BuildkiteClient, BuildkiteTriggerStep } from '#pipeline-utils';

const buildkite = new BuildkiteClient();

async function main() {
  if (!isCurrentHeadInMain()) {
    uploadTriggerBuildStep();
  }
}

function isCurrentHeadInMain() {
  const currentCommit = process.env.BUILDKITE_COMMIT;

  const containmentTest = execSync(
    `git branch -r --contains ${currentCommit} | grep -E "(upstream|origin)/main" | wc -l`
  ).toString();

  return parseInt(containmentTest, 10) >= 1;
}

function uploadTriggerBuildStep() {
  const triggerStep: BuildkiteTriggerStep = {
    label: ':point_right: Trigger emergency commit container build',
    trigger: 'kibana-artifacts-container-image',
    build: {
      message: `Triggered by '${process.env.BUILDKITE_PIPELINE_NAME || 'unknown'}'`,
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
