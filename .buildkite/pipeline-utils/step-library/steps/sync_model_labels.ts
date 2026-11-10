/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../helpers.ts';
import { gcpImageAgent, onDemandAgent } from '../presets.ts';
import type { Step } from '../types.ts';

export const syncModelLabels = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/evals/sync_git_labels.sh',
    label: ':github: Sync models:* labels',
    key: 'sync-git-labels',
    timeout_in_minutes: 30,
    soft_fail: true,
    env: {
      KBN_EVALS: '1',
      FTR_EIS_CCM: '1',
    },
    agents: {
      ...gcpImageAgent('kibana-ubuntu-2404'),
      ...onDemandAgent('n2-standard-4'),
    },
    retry: { automatic: [{ exit_status: -1, limit: 2 }] },
  }),
];
