/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { gateStep } from '../helpers.ts';
import { hyperdiskBalanced, retry, spotAgent, spotZones } from '../presets.ts';
import type { Step } from '../types.ts';

export const localCheck = (): readonly Step[] => [
  gateStep({
    command: '.buildkite/scripts/steps/checks/local_check.sh',
    label: 'Local Check',
    agents: { ...spotAgent('n4-standard-16', spotZones.allUS), ...hyperdiskBalanced },
    key: 'check',
    timeout_in_minutes: 35,
    retry: retry.agentLoss,
  }),
];
