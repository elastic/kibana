/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Owning-team Slack routing for kibana-security-solution-on-merge.
 *
 * Step-level `SLACK_NOTIFICATIONS_CHANNEL` is ignored by kibana-buildkite-build-bot
 * (it only reads pipeline env). This config is used by a post-build fan-out that
 * uploads Buildkite `notify.slack` steps instead.
 *
 * Routing lives in `security_solution_on_merge.suites.json` so teams can edit it
 * without touching code. `specDir` is not read at runtime; it exists so
 * `failed_suite_channels.test.ts` can assert `owners` still matches CODEOWNERS.
 */

import Fs from 'fs';
import Path from 'path';

export const SUITES_CONFIG_RELATIVE_PATH =
  '.buildkite/pipelines/security_solution_on_merge.suites.json';

/**
 * Overrides `fallbackSlackChannel` from pipeline env, so the fallback can be
 * repointed from the pipeline resource definition without a code change.
 */
export const FALLBACK_SLACK_CHANNEL_ENV_VAR = 'SECURITY_ONMERGE_FALLBACK_SLACK_CHANNEL';

/** Last resort for the error path, where reading the config may be what failed. */
export const DEFAULT_FALLBACK_SLACK_CHANNEL = '#sdh-security-team';

export interface SuiteChannel {
  /** Buildkite step label, matched against the (de-sharded) job name. */
  label: string;
  slackChannel: string;
  /** CODEOWNERS teams for `specDir`, asserted by tests. */
  owners: string[];
  /** Repo-relative root of the suite's Cypress specs. */
  specDir: string;
}

export interface SuitesConfig {
  fallbackSlackChannel: string;
  suites: SuiteChannel[];
}

let cachedConfig: SuitesConfig | undefined;

/**
 * Walk up from cwd to find the config: the notify step runs from the repo root,
 * while Jest runs from `.buildkite`.
 */
export function resolveSuitesConfigPath(startDir = process.cwd()): string {
  let dir = Path.resolve(startDir);

  for (;;) {
    const candidate = Path.join(dir, SUITES_CONFIG_RELATIVE_PATH);
    if (Fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = Path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not find ${SUITES_CONFIG_RELATIVE_PATH} above ${startDir}`);
    }
    dir = parent;
  }
}

export function readSuitesConfig(filePath = resolveSuitesConfigPath()): SuitesConfig {
  const parsed = JSON.parse(Fs.readFileSync(filePath, 'utf-8')) as Partial<SuitesConfig>;

  if (!parsed.fallbackSlackChannel || !Array.isArray(parsed.suites)) {
    throw new Error(`${filePath} must define "fallbackSlackChannel" and a "suites" array`);
  }

  return { fallbackSlackChannel: parsed.fallbackSlackChannel, suites: parsed.suites };
}

export function getSuitesConfig(): SuitesConfig {
  if (cachedConfig === undefined) {
    cachedConfig = readSuitesConfig();
  }
  return cachedConfig;
}

/** Test seam; also lets a caller pin the config instead of resolving from cwd. */
export function setSuitesConfig(config: SuitesConfig | undefined): void {
  cachedConfig = config;
}

export function getFallbackSlackChannel(): string {
  const override = process.env[FALLBACK_SLACK_CHANNEL_ENV_VAR]?.trim();
  return override || getSuitesConfig().fallbackSlackChannel;
}

/** Strip the suffixes Buildkite appends to parallel jobs (`Label / 3 / 5`, `Label (3/5)`). */
export function stripShardSuffix(name: string): string {
  return name
    .trim()
    .replace(/ \/\s*\d+\s*\/\s*\d+\s*$/, '')
    .replace(/ \(\d+\/\d+\)$/, '');
}

/**
 * Resolve the suite owning a Buildkite step label.
 *
 * Matches exactly after de-sharding. Prefix matching would let a new suite
 * (`Osquery Cypress Tests - New Variant`) silently inherit an existing suite's
 * channel instead of surfacing as unmapped, and would let the pipeline coverage
 * test pass without anyone adding the mapping.
 */
export function findSuiteForStepLabel(label: string): SuiteChannel | undefined {
  const normalized = stripShardSuffix(label);

  return getSuitesConfig().suites.find((suite) => normalized === suite.label);
}

export function getChannelForStepLabel(label: string): string {
  return findSuiteForStepLabel(label)?.slackChannel ?? getFallbackSlackChannel();
}
