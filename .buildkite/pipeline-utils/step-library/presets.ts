/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AgentConfig, Retry } from './types.ts';

export type Zone =
  | 'us-central1-a'
  | 'us-central1-b'
  | 'us-central1-c'
  | 'us-central1-f'
  | 'us-east1-b'
  | 'us-east1-c'
  | 'us-east1-d'
  | 'us-west1-a'
  | 'us-west1-b'
  | 'us-west1-c'
  | 'asia-south2-a'
  | 'asia-south2-b'
  | 'asia-south2-c'
  | 'europe-west2-a'
  | 'europe-west2-b'
  | 'europe-west2-c'
  | 'northamerica-northeast2-a'
  | 'northamerica-northeast2-b'
  | 'northamerica-northeast2-c'
  | 'southamerica-east1-a'
  | 'southamerica-east1-b'
  | 'southamerica-east1-c';

// Add a machine type here when a ported step first uses it.
export type MachineType =
  | 'c4d-standard-16'
  | 'n2-highcpu-8'
  | 'n2-highmem-4'
  | 'n2-standard-2'
  | 'n2-standard-4'
  | 'n2-standard-8'
  | 'n2-standard-16'
  | 'n2d-custom-16-32768'
  | 'n2d-standard-2'
  | 'n2d-standard-8'
  | 'n4-highcpu-32'
  | 'n4-standard-16'
  | 'n4-standard-32';

export const usZones = [
  'us-central1-a',
  'us-central1-b',
  'us-central1-c',
  'us-central1-f',
  'us-east1-b',
  'us-east1-c',
  'us-east1-d',
  'us-west1-a',
  'us-west1-b',
  'us-west1-c',
] as const satisfies readonly Zone[];

export const spotZones = {
  centralFCA: ['us-central1-f', 'us-central1-c', 'us-central1-a'],
  centralFCBA: ['us-central1-f', 'us-central1-c', 'us-central1-b', 'us-central1-a'],
  allUS: usZones,
  // Zones aligned with the preemptible N2D CPU quota, which is separate from the standard quota.
  n2dPreemptible: [
    'asia-south2-a',
    'asia-south2-b',
    'asia-south2-c',
    'europe-west2-a',
    'europe-west2-b',
    'europe-west2-c',
    'northamerica-northeast2-a',
    'northamerica-northeast2-b',
    'northamerica-northeast2-c',
    'southamerica-east1-a',
    'southamerica-east1-b',
    'southamerica-east1-c',
  ],
} as const satisfies Record<string, readonly Zone[]>;

// Exit statuses are integers or '*', the forms Buildkite's schema allows.
//
// NOTE: This *cannot* be `as const`, which would infer the arrays as `readonly`.
// The SDK type expects mutable arrays.
export const retry = {
  agentLoss: {
    automatic: [{ exit_status: -1, limit: 3 }],
  },
  anyOnce: {
    automatic: [{ exit_status: '*', limit: 1 }],
  },
  agentLossOrAnyOnce: {
    automatic: [
      { exit_status: -1, limit: 3 },
      { exit_status: '*', limit: 1 },
    ],
  },
} satisfies Record<string, Retry>;

export const hyperdiskBalanced = { diskType: 'hyperdisk-balanced' } as const;

export const k8sMinimalAgent = (): AgentConfig => ({
  provider: 'k8s',
  image: 'docker.elastic.co/ci-agent-images/kibana/ci-minimal',
  imageUID: 1000,
});

export const onDemandAgent = (machineType: MachineType): AgentConfig => ({ machineType });

export const preemptibleAgent = (machineType: MachineType): AgentConfig => ({
  machineType,
  preemptible: true,
});

// For a non-preemptible agent restricted to these zones.
export const agentZones = (zones: readonly Zone[]): Pick<AgentConfig, 'zones'> => ({
  zones: zones.join(','),
});

export const spotAgent = (machineType: MachineType, zones: readonly Zone[]): AgentConfig => ({
  ...preemptibleAgent(machineType),
  spotZones: zones.join(','),
});

export const mainTargetBranchOnly = "build.env('GITHUB_PR_TARGET_BRANCH') == 'main'";

export const securitySolutionCypressDefaults = {
  agents: spotAgent('n2-standard-4', spotZones.centralFCA),
  depends_on: ['build'],
  timeout_in_minutes: 60,
  retry: retry.agentLossOrAnyOnce,
};

export const securitySolutionHighMemoryCypressDefaults = {
  ...securitySolutionCypressDefaults,
  agents: spotAgent('n2-highmem-4', spotZones.centralFCA),
};
