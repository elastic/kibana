/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildkite } from './shared';
import { getSelectedCommitHash } from './info_sections/commit_info';
import { BuildkiteTriggerStep } from '#pipeline-utils';

const IS_DRY_RUN = process.env.DRY_RUN?.match(/(1|true)/i);
const REMOTE_SERVICE_CONFIG = `https://raw.githubusercontent.com/elastic/serverless-gitops/main/gen/gpctl/kibana/config.yaml`;

async function main() {
  const selectedSha = getSelectedCommitHash();
  uploadTriggerStep(selectedSha);
}

function uploadTriggerStep(commitSha: string) {
  const triggerStep: BuildkiteTriggerStep = {
    label: ':ship: Trigger GPCTL / Release Kibana',
    trigger: 'gpctl-promote',
    async: true,
    build: {
      message: 'Triggered by Kibana serverless release pipeline',
      env: {
        SERVICE_COMMIT_HASH: commitSha.slice(0, 12),
        REMOTE_SERVICE_CONFIG,
        ...(IS_DRY_RUN ? { DRY_RUN: 'true' } : {}),
      },
    },
  };

  buildkite.uploadSteps([triggerStep]);
}

main()
  .then(() => {
    console.log('GPCTL Trigger step uploaded.');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
