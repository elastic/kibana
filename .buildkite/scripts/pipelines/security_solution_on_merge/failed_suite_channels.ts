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
 * Step-level Slack env is ignored by the build-bot; this drives post-build fan-out instead.
 * `specDir` / `owners` are for the CODEOWNERS agreement test, not runtime routing.
 */

import Fs from 'fs';
import Path from 'path';

export const SUITES_CONFIG_RELATIVE_PATH =
  '.buildkite/pipelines/security_solution_on_merge.suites.json';

/** Pipeline-env override for `fallbackSlackChannel`. */
export const FALLBACK_SLACK_CHANNEL_ENV_VAR = 'SECURITY_ONMERGE_FALLBACK_SLACK_CHANNEL';

/** Used when reading the suites config itself fails. */
export const DEFAULT_FALLBACK_SLACK_CHANNEL = '#sdh-security-team';

export interface SuiteChannel {
  /** Buildkite step label (matched after de-sharding). */
  label: string;
  slackChannel: string;
  /** CODEOWNERS teams for `specDir` (asserted by tests). */
  owners: string[];
  /** Repo-relative Cypress suite root. */
  specDir: string;
}

export interface SuitesConfig {
  fallbackSlackChannel: string;
  suites: SuiteChannel[];
}

let cachedConfig: SuitesConfig | undefined;

/** Walk up from cwd so both repo-root agents and `.buildkite` Jest resolve the same file. */
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

/** Test seam to pin config without resolving from cwd. */
export function setSuitesConfig(config: SuitesConfig | undefined): void {
  cachedConfig = config;
}

export function getFallbackSlackChannel(): string {
  const override = process.env[FALLBACK_SLACK_CHANNEL_ENV_VAR]?.trim();
  return override || getSuitesConfig().fallbackSlackChannel;
}

/** Strip Buildkite parallel suffixes (`Label / 3 / 5`, `Label (3/5)`). */
export function stripShardSuffix(name: string): string {
  return name
    .trim()
    .replace(/ \/\s*\d+\s*\/\s*\d+\s*$/, '')
    .replace(/ \(\d+\/\d+\)$/, '');
}

/** Exact label match after de-sharding (no prefix inheritance). */
export function findSuiteForStepLabel(label: string): SuiteChannel | undefined {
  const normalized = stripShardSuffix(label);

  return getSuitesConfig().suites.find((suite) => normalized === suite.label);
}

export function getChannelForStepLabel(label: string): string {
  return findSuiteForStepLabel(label)?.slackChannel ?? getFallbackSlackChannel();
}
