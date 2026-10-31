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

export const isomerStudio = (): readonly Step[] => [
  commandStep({
    command: 'bash .buildkite/scripts/steps/isomer_studio.sh',
    label: 'Build shared Isomer Studio',
    key: 'isomer-studio',
    agents: spotAgent('n2d-standard-2', spotZones.n2dPreemptible),
    timeout_in_minutes: 30,
    retry: retry.agentLoss,
  }),
];
