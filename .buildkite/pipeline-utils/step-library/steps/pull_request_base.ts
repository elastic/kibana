/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep, gateStep } from '../helpers.ts';
import {
  agentZones,
  hyperdiskBalanced,
  onDemandAgent,
  retry,
  spotAgent,
  spotZones,
  usZones,
} from '../presets.ts';
import type { Step } from '../types.ts';

const minimalImage = 'family/kibana-minimal-ubuntu-2604';

export const prBaseEnv = { KBN_ES_SNAPSHOT_USE_CACHED: 'true' } as const;

// The Kibana build and the gate steps. A failing gate step cancels the steps
// registered for cancel-on-gate, so these are not themselves rendered with
// `cancelOnGateFailure`.
export const prBaseSteps = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/build_kibana.sh',
    label: 'Build Kibana Distribution',
    agents: {
      ...onDemandAgent('n2d-custom-16-32768'),
      ...agentZones(usZones),
      image: minimalImage,
      diskSizeGb: 50,
      buildDirectory: '/dev/shm/bk',
    },
    key: 'build',
    if: "build.env('KIBANA_BUILD_ID') == null || build.env('KIBANA_BUILD_ID') == ''",
    timeout_in_minutes: 60,
    retry: retry.agentLoss,
  }),
  gateStep({
    command: '.buildkite/scripts/steps/quick_checks.sh',
    label: 'Quick Checks',
    agents: spotAgent('n2d-standard-8', spotZones.n2dPreemptible),
    key: 'quick_checks',
    timeout_in_minutes: 60,
    retry: retry.agentLoss,
  }),
  gateStep({
    command: '.buildkite/scripts/steps/checks.sh',
    label: 'Checks',
    key: 'checks',
    agents: spotAgent('n2d-standard-2', spotZones.n2dPreemptible),
    timeout_in_minutes: 60,
    retry: retry.agentLoss,
  }),
  gateStep({
    command: '.buildkite/scripts/steps/lint.sh',
    label: 'Linting',
    agents: {
      ...spotAgent('n4-standard-16', spotZones.allUS),
      ...hyperdiskBalanced,
    },
    key: 'linting',
    timeout_in_minutes: 60,
    retry: retry.agentLoss,
  }),
  gateStep({
    command: '.buildkite/scripts/steps/lint_with_types.sh',
    label: 'Linting (with types)',
    agents: {
      ...spotAgent('n4-standard-32', spotZones.allUS),
      ...hyperdiskBalanced,
    },
    key: 'linting_with_types',
    timeout_in_minutes: 60,
    retry: retry.agentLoss,
  }),
  gateStep({
    command: '.buildkite/scripts/steps/typecheck/check_types.sh',
    label: 'Check Types',
    agents: {
      ...spotAgent('n4-highcpu-32', spotZones.allUS),
      ...hyperdiskBalanced,
    },
    key: 'check_types',
    timeout_in_minutes: 60,
    env: {
      RESTORE_ARCHIVE: 'true',
      UPLOAD_ARCHIVE: 'true',
    },
    retry: retry.agentLoss,
  }),
  commandStep({
    command: '.buildkite/scripts/steps/test/pick_test_group_run_order.sh',
    label: 'Pick Test Group Run Order',
    key: 'pick_test_group_run_order',
    agents: { ...onDemandAgent('n2-standard-2') },
    timeout_in_minutes: 15,
    env: {
      JEST_UNIT_SCRIPT: '.buildkite/scripts/steps/test/jest.sh',
      JEST_INTEGRATION_SCRIPT: '.buildkite/scripts/steps/test/jest_integration.sh',
      FTR_CONFIGS_SCRIPT: '.buildkite/scripts/steps/test/ftr_configs.sh',
      FTR_CONFIGS_DEPS: 'build',
      FTR_TEST_CHANNELS: 'ci-on-commit',
    },
    retry: retry.anyOnce,
  }),
  commandStep({
    command: '.buildkite/scripts/steps/test/scout/test_run_builder.sh',
    label: 'Scout Test Run Builder',
    agents: { ...onDemandAgent('n2d-standard-8'), ...agentZones(usZones) },
    key: 'build_scout_tests',
    timeout_in_minutes: 20,
    env: {
      SCOUT_TEST_DISTRIBUTION_STRATEGY: 'lanes',
      SCOUT_TEST_LANES_GROUP_DEPS: 'build_scout_tests,build',
      SCOUT_TEST_CHANNELS: 'ci-on-commit',
      SCOUT_TEST_SERVER_START_TIMEOUT_SECONDS: 300,
      SCOUT_TEST_LANE_ESTIMATED_SETUP_MINUTES: 5,
      SCOUT_TEST_LANE_TARGET_RUNTIME_MINUTES: 23,
      SELECTIVE_TESTING_ENABLED: 'true',
    },
    retry: retry.anyOnce,
  }),
  commandStep({
    command: '.buildkite/scripts/steps/ci_stats_ready.sh',
    label: 'Mark CI Stats as ready',
    agents: { ...onDemandAgent('n2-standard-2'), image: minimalImage },
    key: 'ci_stats_ready',
    timeout_in_minutes: 10,
    depends_on: ['build', 'report_package_metrics'],
    retry: retry.anyOnce,
  }),
  commandStep({
    command: '.buildkite/scripts/steps/report_package_metrics.sh',
    label: 'Report Package Metrics',
    agents: onDemandAgent('n2-standard-2'),
    key: 'report_package_metrics',
    timeout_in_minutes: 15,
    retry: retry.agentLoss,
  }),
];
