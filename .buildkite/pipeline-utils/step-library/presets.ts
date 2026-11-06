/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AgentConfig, Retry } from './types.ts';

export type SpotZone =
  | 'asia-south2-a'
  | 'asia-south2-b'
  | 'asia-south2-c'
  | 'northamerica-northeast2-a'
  | 'northamerica-northeast2-b'
  | 'northamerica-northeast2-c';

// Add a machine type here when a ported step first uses it.
export type MachineType = 'n2-standard-8';

export const spotZones = {
  n2: [
    'asia-south2-a',
    'asia-south2-b',
    'asia-south2-c',
    'northamerica-northeast2-a',
    'northamerica-northeast2-b',
    'northamerica-northeast2-c',
  ],
} as const satisfies Record<string, readonly SpotZone[]>;

// Exit statuses are integers or '*', the forms Buildkite's schema allows.
//
// NOTE: This *cannot* be `as const`, which would infer the arrays as `readonly`.
// The SDK type expects mutable arrays.
export const retry = {
  agentLossOrAnyOnce: {
    automatic: [
      { exit_status: -1, limit: 3 },
      { exit_status: '*', limit: 1 },
    ],
  },
} satisfies Record<string, Retry>;

export const pdBalanced = { diskType: 'pd-balanced' } as const;

export const spotAgent = (machineType: MachineType, zones: readonly SpotZone[]): AgentConfig => ({
  machineType,
  preemptible: true,
  spotZones: zones.join(','),
});
