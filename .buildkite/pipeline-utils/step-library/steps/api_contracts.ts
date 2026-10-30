/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../helpers.ts';
import { hyperdiskBalanced, retry, spotAgent } from '../presets.ts';
import type { Step } from '../types.ts';

export const apiContracts = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/checks/api_contracts.sh',
    label: 'Check API Contracts',
    agents: {
      ...spotAgent('c4d-standard-2', ['us-central1-c', 'us-central1-a']),
      ...hyperdiskBalanced,
    },
    key: 'check_api_contracts',
    depends_on: 'check_oas_snapshot',
    timeout_in_minutes: 30,
    // Breaking changes in stable/tech_preview APIs fail the check but only warn:
    // soft_fail keeps the failure visible (step + PR comment) without blocking
    // merge. Remove this line to make it a hard merge gate.
    soft_fail: true,
    retry: retry.agentLoss,
  }),
];
