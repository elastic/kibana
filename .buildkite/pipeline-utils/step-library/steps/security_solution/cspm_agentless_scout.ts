/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../../helpers.ts';
import { retry, spotAgent, spotZones } from '../../presets.ts';
import type { Step } from '../../types.ts';

export const cspmAgentlessScoutSteps = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/test/cspm_agentless_scout.sh',
    label: 'CSPM Agentless Scout E2E Tests',
    key: 'cspm-agentless-scout',
    agents: spotAgent('n2-standard-8', spotZones.centralFCA),
    depends_on: ['build'],
    timeout_in_minutes: 60,
    retry: retry.agentLossOrAnyOnce,
  }),
];
