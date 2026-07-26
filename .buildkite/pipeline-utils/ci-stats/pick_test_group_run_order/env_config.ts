/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_MINUTES, RETRIES, PREVENT_SELECTIVE_TESTS_LABEL } from './const';
import { collectEnvFromLabels, getRequiredEnv } from '#pipeline-utils';

const VALID_SOLUTIONS = ['observability', 'search', 'security', 'workplaceai', 'vectordb'];
const VALID_LIMIT_CONFIG_TYPES = ['unit', 'integration', 'functional'];

// Defaults mirror `.buildkite/scripts/common/env.sh` so this script can also run
// outside the standard Buildkite bootstrap (locally, ad-hoc pipelines, etc.).
const DEFAULT_TEST_GROUP_TYPE_UNIT = 'Jest Unit Tests';
const DEFAULT_TEST_GROUP_TYPE_INTEGRATION = 'Jest Integration Tests';
const DEFAULT_TEST_GROUP_TYPE_FUNCTIONAL = 'Functional Tests';

/**
 * Read and validate every `process.env.*` input the orchestrator depends on.
 * Throws synchronously when something is malformed so callers don't have to.
 *
 * Only the Buildkite-injected branch/pipeline slug are treated as hard
 * requirements. Test-type names fall back to the well-known defaults from
 * `common/env.sh`, and per-script env vars (JEST_UNIT_SCRIPT, etc.) are
 * optional here — they're validated by the orchestrator only when a step of
 * the corresponding type is actually going to be emitted.
 */
export function loadRunOrderConfig() {
  return {
    ownBranch: getRequiredEnv('BUILDKITE_BRANCH'),
    pipelineSlug: getRequiredEnv('BUILDKITE_PIPELINE_SLUG'),

    unitType: process.env.TEST_GROUP_TYPE_UNIT || DEFAULT_TEST_GROUP_TYPE_UNIT,
    integrationType: process.env.TEST_GROUP_TYPE_INTEGRATION || DEFAULT_TEST_GROUP_TYPE_INTEGRATION,
    functionalType: process.env.TEST_GROUP_TYPE_FUNCTIONAL || DEFAULT_TEST_GROUP_TYPE_FUNCTIONAL,

    jestUnitMaxMinutes: parseFloatEnv('JEST_UNIT_MAX_MINUTES', MAX_MINUTES.JEST_UNIT_DEFAULT),
    jestIntegrationMaxMinutes: parseFloatEnv(
      'JEST_INTEGRATION_MAX_MINUTES',
      MAX_MINUTES.JEST_INTEGRATION_DEFAULT
    ),
    functionalMaxMinutes: parseFloatEnv('FUNCTIONAL_MAX_MINUTES', MAX_MINUTES.FUNCTIONAL_DEFAULT),

    jestUnitTooLongMinutes: MAX_MINUTES.TOO_LONG,
    jestIntegrationTooLongMinutes: MAX_MINUTES.TOO_LONG,
    functionalTooLongMinutes: MAX_MINUTES.TOO_LONG,

    limitConfigType: parseLimitConfigType(),
    limitSolutions: parseLimitSolutions(),
    ftrConfigPatterns: parseCsvEnv('FTR_CONFIG_PATTERNS'),

    functionalMinimumIsolationMin: parseOptionalFloatEnv('FUNCTIONAL_MINIMUM_ISOLATION_MIN'),

    ftrConfigsRetryCount: parseIntEnv('FTR_CONFIGS_RETRY_COUNT', RETRIES.FTR),
    jestConfigsRetryCount: parseIntEnv('JEST_CONFIGS_RETRY_COUNT', RETRIES.JEST),

    // FTR_CONFIGS_DEPS / JEST_CONFIGS_DEPS originally use an explicit `!== undefined`
    // check, so an explicit empty string yields [] (no deps), distinct from "unset".
    ftrConfigsDeps: parseDefinedCsvEnv('FTR_CONFIGS_DEPS') ?? ['build'],
    jestConfigsDeps: parseDefinedCsvEnv('JEST_CONFIGS_DEPS') ?? [],

    // Optional here; required by the orchestrator only when a step of that
    // type is actually going to be emitted (parallelism > 0 / non-empty group).
    jestUnitScript: process.env.JEST_UNIT_SCRIPT || undefined,
    jestIntegrationScript: process.env.JEST_INTEGRATION_SCRIPT || undefined,
    ftrConfigsScript: process.env.FTR_CONFIGS_SCRIPT || undefined,

    ftrExtraArgs: process.env.FTR_EXTRA_ARGS
      ? { FTR_EXTRA_ARGS: process.env.FTR_EXTRA_ARGS }
      : ({} as Record<string, string>),
    envFromLabels: collectEnvFromLabels(),

    // default true on PRs
    useSelectiveTesting:
      Boolean(process.env.GITHUB_PR_NUMBER) &&
      !(parseCsvEnv('GITHUB_PR_LABELS') ?? []).includes(PREVENT_SELECTIVE_TESTS_LABEL),
    prMergeBase: process.env.GITHUB_PR_MERGE_BASE || undefined,
    prNumber: process.env.GITHUB_PR_NUMBER || undefined,
  } as const;
}

export type RunOrderConfig = ReturnType<typeof loadRunOrderConfig>;

function parseFloatEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const value = parseFloat(raw);
  if (Number.isNaN(value)) {
    throw new Error(`invalid ${name}: ${raw}`);
  }
  return value;
}

function parseOptionalFloatEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = parseFloat(raw);
  if (Number.isNaN(value)) {
    throw new Error(`invalid ${name}: ${raw}`);
  }
  return value;
}

function parseIntEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (!raw) return defaultValue;
  const value = parseInt(raw, 10);
  if (Number.isNaN(value)) {
    throw new Error(`invalid ${name}: ${raw}`);
  }
  return value;
}

/** Returns undefined when the env var is unset OR an empty string. */
function parseCsvEnv(name: string): string[] | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  return splitCsv(raw);
}

/** Returns undefined only when the env var is unset; an empty string yields []. */
function parseDefinedCsvEnv(name: string): string[] | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  return splitCsv(raw);
}

function splitCsv(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseLimitConfigType(): string[] {
  const values = parseCsvEnv('LIMIT_CONFIG_TYPE');
  if (!values) return VALID_LIMIT_CONFIG_TYPES;
  const invalid = values.filter((v) => !VALID_LIMIT_CONFIG_TYPES.includes(v));
  if (invalid.length) {
    throw new Error(
      `invalid LIMIT_CONFIG_TYPE value(s): ${invalid.join(
        ', '
      )}. Valid values: ${VALID_LIMIT_CONFIG_TYPES.join(', ')}`
    );
  }
  return values;
}

function parseLimitSolutions(): string[] | undefined {
  const limitSolutions = parseCsvEnv('LIMIT_SOLUTIONS');
  if (!limitSolutions) return undefined;
  const invalid = limitSolutions.filter((s) => !VALID_SOLUTIONS.includes(s));
  if (invalid.length) {
    throw new Error('Unsupported LIMIT_SOLUTIONS value');
  }
  return limitSolutions;
}
