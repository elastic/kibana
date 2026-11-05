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

export const scoutFleetRealAgentSteps = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/test/scout_fleet_real_agent.sh',
    label: 'Scout Fleet Real Agent',
    key: 'scout-fleet-real-agent',
    agents: spotAgent('n2-highmem-4', spotZones.centralFCA),
    depends_on: ['build'],
    // One stack with a Docker Fleet Server and Docker Elastic Agents.
    timeout_in_minutes: 60,
    retry: retry.agentLossOrAnyOnce,
  }),
];
