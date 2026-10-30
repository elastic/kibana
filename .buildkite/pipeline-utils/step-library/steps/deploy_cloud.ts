/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../helpers.ts';
import { onDemandAgent } from '../presets.ts';
import type { Step } from '../types.ts';

// Cloud deploy keys are only granted to kibana-deploy-cloud-from-pr, so the PR build hands the deploy off to it
export const deployCloudSteps = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/trigger_from_pr.sh kibana-deploy-cloud-from-pr',
    label: 'Trigger Cloud Deployment',
    key: 'deploy_cloud',
    agents: {
      provider: 'gcp',
      image: 'family/kibana-minimal-ubuntu-2604',
      imageProject: 'elastic-images-prod',
      ...onDemandAgent('n2-standard-2'),
    },
    timeout_in_minutes: 10,
    retry: { automatic: [{ exit_status: -1, limit: 1 }] },
  }),
];
