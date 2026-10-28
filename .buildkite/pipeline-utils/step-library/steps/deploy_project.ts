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

export const deployProjectSteps = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/artifacts/docker_image.sh',
    label: 'Build Project Image',
    key: 'build_project_image',
    agents: preemptibleAgent('n2-standard-16'),
    timeout_in_minutes: 90,
    retry: retry.agentLoss,
  }),
  commandStep({
    command: '.buildkite/scripts/steps/serverless/deploy.sh',
    label: 'Deploy Project',
    key: 'deploy_project',
    agents: preemptibleAgent('n2-standard-4'),
    timeout_in_minutes: 10,
    depends_on: ['build_project_image'],
    retry: retry.agentLoss,
  }),
];
