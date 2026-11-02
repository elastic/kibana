/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { gateStep } from '../helpers.ts';
import { retry, spotAgent, spotZones } from '../presets.ts';
import type { Step } from '../types.ts';

export const checkOasSnapshot = (): readonly Step[] => [
  gateStep({
    command: '.buildkite/scripts/steps/checks/capture_oas_snapshot.sh',
    label: 'Check OAS Snapshot',
    agents: spotAgent('n2d-standard-2', spotZones.n2dPreemptible),
    key: 'check_oas_snapshot',
    depends_on: ['build'],
    timeout_in_minutes: 60,
    retry: retry.agentLoss,
  }),
];
