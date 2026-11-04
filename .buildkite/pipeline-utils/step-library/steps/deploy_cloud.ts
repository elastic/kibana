/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../helpers.ts';
import { preemptibleAgent, retry } from '../presets.ts';
import type { Step } from '../types.ts';

export const deployCloudSteps = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/cloud/build_cloud_image.sh',
    label: 'Build Cloud Image',
    key: 'build_cloud_image',
    // Shared with kibana-deploy-cloud-from-pr so both pipelines never build or deploy the same PR at once
    concurrency: 1,
    concurrency_group: 'kibana/cloud-image/pr-${GITHUB_PR_NUMBER}',
    agents: preemptibleAgent('n2-standard-16'),
    timeout_in_minutes: 60,
    retry: retry.agentLoss,
  }),
  commandStep({
    command: '.buildkite/scripts/steps/cloud/deploy.sh',
    label: 'Deploy to Cloud',
    key: 'deploy_cloud',
    concurrency: 1,
    concurrency_group: 'kibana/cloud-deploy/pr-${GITHUB_PR_NUMBER}',
    agents: preemptibleAgent('n2-standard-2'),
    depends_on: ['build_cloud_image'],
    timeout_in_minutes: 30,
    retry: retry.agentLoss,
  }),
];
