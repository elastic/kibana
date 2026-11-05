/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../helpers.ts';
import { retry, spotAgent, spotZones } from '../presets.ts';
import type { Step } from '../types.ts';

export const promptChanges = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/checks/prompt_changes_detector.sh',
    label: 'Check Prompt Changes',
    key: 'prompt_changes',
    agents: spotAgent('n2-standard-2', spotZones.centralFCA),
    timeout_in_minutes: 10,
    retry: retry.agentLoss,
  }),
];
