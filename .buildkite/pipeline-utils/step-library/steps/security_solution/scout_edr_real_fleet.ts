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

const edrRealFleetAgents = {
  ...spotAgent('n2-highmem-4', spotZones.centralFCA),
  enableNestedVirtualization: true,
};

export const scoutEdrRealFleetSteps = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/test/scout_edr_real_fleet.sh stateful',
    label: 'Scout EDR Real Fleet - ECH',
    key: 'scout-edr-real-fleet-ech',
    agents: edrRealFleetAgents,
    depends_on: ['build'],
    // UI stack, then API stack. Serverless is a separate step.
    timeout_in_minutes: 120,
    retry: retry.agentLossOrAnyOnce,
  }),
  commandStep({
    command: '.buildkite/scripts/steps/test/scout_edr_real_fleet.sh serverless',
    label: 'Scout EDR Real Fleet - Serverless',
    key: 'scout-edr-real-fleet-serverless',
    agents: edrRealFleetAgents,
    depends_on: ['build'],
    // UI stack, then API stack. ECH is a separate step.
    timeout_in_minutes: 120,
    retry: retry.agentLossOrAnyOnce,
  }),
];
