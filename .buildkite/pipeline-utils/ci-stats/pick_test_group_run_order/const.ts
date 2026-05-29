/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Environment variables that drive test selection and pipeline behaviour.
 *
 * Hard requirements (always injected by Buildkite):
 *   BUILDKITE_BRANCH            — current branch
 *   BUILDKITE_PIPELINE_SLUG     — current pipeline slug
 *
 * Conditionally required (only when a step of that type will actually be emitted —
 * i.e. the type is in LIMIT_CONFIG_TYPE *and* ci-stats produces a non-empty group):
 *   JEST_UNIT_SCRIPT            — shell command that runs a single jest unit job
 *   JEST_INTEGRATION_SCRIPT     — shell command that runs a single jest integration job
 *   FTR_CONFIGS_SCRIPT          — shell command that runs a single ftr job
 *
 * Have sensible defaults (set in `.buildkite/scripts/common/env.sh`,
 * fall back to the same values in `env_config.ts`):
 *   TEST_GROUP_TYPE_UNIT        — ci-stats type name for jest unit groups
 *   TEST_GROUP_TYPE_INTEGRATION — ci-stats type name for jest integration groups
 *   TEST_GROUP_TYPE_FUNCTIONAL  — ci-stats type name for ftr groups
 *
 * Optional feature flags / filters (absent means "not set" / disabled):
 *   LIMIT_CONFIG_TYPE            — comma-separated subset of: unit, integration, functional
 *   LIMIT_SOLUTIONS              — comma-separated subset of: observability, search, security, workplaceai
 *   FTR_CONFIG_PATTERNS          — glob patterns to restrict which FTR configs run
 *   FUNCTIONAL_MINIMUM_ISOLATION_MIN — minimum expected isolation time for FTR groups
 *   FTR_CONFIGS_DEPS             — comma-separated Buildkite step keys this step depends on
 *   JEST_CONFIGS_DEPS            — comma-separated Buildkite step keys this step depends on
 *   FTR_EXTRA_ARGS               — extra CLI args forwarded to FTR jobs via env
 *   GITHUB_PR_NUMBER             — PR number; activates PR-specific ci-stats source
 *   GITHUB_PR_MERGE_BASE         — merge-base commit; activates selective testing + merge-base source
 *   GITHUB_PR_LABELS             — comma-separated PR labels; activates selective testing when
 *                                  it contains the selective-tests label
 */

/**
 * Per-type wall-time limits (minutes). `JEST_UNIT_DEFAULT`, `JEST_INTEGRATION_DEFAULT`,
 * and `FUNCTIONAL_DEFAULT` are the upper bound for a single parallel job and are
 * overridable via env vars. `TOO_LONG` triggers a warning annotation when exceeded.
 */
export const MAX_MINUTES = {
  JEST_UNIT_DEFAULT: 30, // env: JEST_UNIT_MAX_MINUTES
  JEST_INTEGRATION_DEFAULT: 30, // env: JEST_INTEGRATION_MAX_MINUTES
  FUNCTIONAL_DEFAULT: 30, // env: FUNCTIONAL_MAX_MINUTES
  TOO_LONG: 27,
} as const;

/**
 * Retry counts. `TEST_DEFAULT` is the default number of test-failure retries,
 * overridable per type via env vars. `INFRA` is the fixed limit for
 * infrastructure-signal retries (-1 exit status).
 */
export const RETRIES = {
  JEST: 1, // env: JEST_CONFIGS_RETRY_COUNT
  FTR: 1, // env: FTR_CONFIGS_RETRY_COUNT
  INFRA: 3,
} as const;

/**
 * ci-stats duration estimation parameters spread into each test-type group.
 * Controls how configs are binned into parallel jobs.
 */
export const CI_STATS_DEFAULTS = {
  JEST_UNIT: {
    defaultMin: 4,
    overheadMin: 0.2,
    warmupMin: 4,
    concurrency: 3,
  },
  JEST_INTEGRATION: {
    defaultMin: 15,
    overheadMin: 0.2,
    warmupMin: 5,
    concurrency: 1,
  },
  FUNCTIONAL: {
    defaultMin: 60,
    overheadMin: 0,
    warmupMin: 3,
  },
} as const;

/** Percentile used when ci-stats estimates per-config durations. */
export const DURATION_PERCENTILE = 75;

/** Timeout applied to every test step regardless of type. */
export const TEST_STEP_TIMEOUT_MINUTES = 50;

/** Agent disk sizes (GiB) per step type. */
export const AGENT_DISK_GIB = {
  JEST_UNIT: 110,
  JEST_INTEGRATION: 105,
  FTR: 105,
} as const;

/** Well-known Buildkite pipeline slugs referenced in source prioritization. */
export const PIPELINES = {
  ON_MERGE: 'kibana-on-merge',
  PULL_REQUEST: 'kibana-pull-request',
  ES_SERVERLESS_VERIFY: 'kibana-elasticsearch-serverless-verify-and-promote',
} as const;

/** Buildkite step/group keys registered for cancel-on-gate-failure. */
export const STEP_KEYS = {
  JEST_UNIT: 'jest',
  JEST_INTEGRATION: 'jest-integration',
  FTR_GROUP: 'ftr-configs',
} as const;

/** PR label that prevents selective testing. */
export const PREVENT_SELECTIVE_TESTS_LABEL = 'ci:prevent-selective-testing';

/**
 * PR label that drops FTR configs belonging to solutions the PR does not touch.
 * Only takes effect when the diff is confined to one or more solutions (no
 * platform/shared/CI/test-infra changes); otherwise the full suite still runs.
 */
export const FTR_SKIP_UNAFFECTED_LABEL = 'ci:skip-unaffected-ftr-configs';

/**
 * PR label that keeps running FTR configs of untouched solutions but makes their
 * failures non-blocking (they no longer fail the PR). Same confinement gate as
 * the skip label. If both labels are present, skip wins.
 */
export const FTR_SOFT_FAIL_UNAFFECTED_LABEL = 'ci:soft-fail-unaffected-ftr-configs';

/** The base `group` shared across solutions (from `kibana.jsonc`). */
export const PLATFORM_GROUP = 'platform';

/** Solution `group` values (from `kibana.jsonc`), matching `VALID_SOLUTIONS`. */
export const SOLUTION_GROUPS = [
  'observability',
  'security',
  'search',
  'workplaceai',
  'vectordb',
] as const;

/**
 * Maps a solution `group` to the infix used in its FTR manifest filenames
 * (`.buildkite/ftr-manifests/ftr_<infix>_*.yml`). Most match 1:1, but a few
 * historical names differ (`observability`→`oblt`, `workplaceai`→`workplace_ai`).
 */
export const SOLUTION_MANIFEST_INFIX: Record<string, string> = {
  observability: 'oblt',
  security: 'security',
  search: 'search',
  workplaceai: 'workplace_ai',
  vectordb: 'vectordb',
};

/**
 * Touching any of these forces the full FTR suite to run (blocking), even when
 * the rest of the diff looks solution-scoped. Kept narrow: shared test harness,
 * FTR base services, CI selection logic, and root toolchain files. Most of these
 * already resolve to the `platform` group or `[uncategorized]` and would bail
 * anyway — listing them makes the intent explicit and guards path edge-cases.
 */
export const CRITICAL_FILES_FTR = [
  'package.json',
  'yarn.lock',
  'tsconfig.base.json',
  'tsconfig.json',
  '.node-version',
  '.nvmrc',
  'src/setup_node_env/**/*',
  'src/platform/packages/shared/kbn-test/**/*',
  'src/platform/packages/shared/kbn-ftr-common-functional-services/**/*',
  'src/platform/packages/shared/kbn-ftr-common-functional-ui-services/**/*',
  '.buildkite/ftr-manifests/**/*',
  '.buildkite/pipeline-utils/affected-packages/**/*.{ts,js,sh}',
  '.buildkite/pipeline-utils/ci-stats/**/*.{ts,js}',
  '.buildkite/scripts/steps/test/**/*',
];
