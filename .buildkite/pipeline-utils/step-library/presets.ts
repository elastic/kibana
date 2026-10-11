/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AgentConfig, Retry } from './types.ts';

export const spotZones = {
  centralFCA: 'us-central1-f,us-central1-c,us-central1-a',
} as const;

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

export const spotAgent = (machineType: string, zones: string): AgentConfig => ({
  machineType,
  preemptible: true,
  spotZones: zones,
});
