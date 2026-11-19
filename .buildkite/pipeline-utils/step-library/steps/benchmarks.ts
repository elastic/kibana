/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../helpers.ts';
import { agentZones, hyperdiskBalanced, onDemandAgent } from '../presets.ts';
import type { Step } from '../types.ts';

const benchmarkZones = [
  'us-central1-a',
  'us-central1-b',
  'us-central1-c',
  'us-central1-f',
  'us-east1-b',
  'us-east1-c',
  'us-east1-d',
] as const;

const smallerBenchmarkZones = ['us-central1-c', 'us-central1-a'] as const;

export const jestBenchSteps = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/jest_bench.sh',
    label: 'Jest Bench',
    key: 'jest_bench',
    agents: {
      ...onDemandAgent('c4d-standard-16'),
      ...hyperdiskBalanced,
      ...agentZones(benchmarkZones),
    },
    timeout_in_minutes: 60,
    soft_fail: true,
  }),
];

export const ftrBenchSteps = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/ftr_bench.sh',
    label: 'FTR Bench',
    key: 'ftr_bench',
    agents: {
      ...onDemandAgent('c4d-standard-16'),
      ...hyperdiskBalanced,
      ...agentZones(smallerBenchmarkZones),
      diskSizeGb: 200,
    },
    timeout_in_minutes: 120,
    soft_fail: true,
  }),
];

export const pageLoadBenchSteps = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/page_load_bench.sh',
    label: 'Page Load Bench',
    key: 'page_load_bench',
    agents: {
      ...onDemandAgent('c4d-standard-16'),
      ...hyperdiskBalanced,
      ...agentZones(smallerBenchmarkZones),
      diskSizeGb: 200,
    },
    timeout_in_minutes: 120,
    soft_fail: true,
  }),
];

export const warmStartMemoryBenchSteps = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/warm_start_memory_bench.sh',
    label: 'Warm-start Memory Bench',
    key: 'warm_start_memory_bench',
    depends_on: 'build',
    agents: {
      ...onDemandAgent('c4d-standard-16'),
      ...hyperdiskBalanced,
      ...agentZones(benchmarkZones),
    },
    timeout_in_minutes: 90,
    env: { WARM_START_MEMORY_COMMENT_ENABLED: 'true' },
    soft_fail: true,
  }),
];
