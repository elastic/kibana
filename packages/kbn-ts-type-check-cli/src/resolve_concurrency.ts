/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Os from 'os';

/**
 * `tsgo -b` is an orchestrator: `--builders` projects build concurrently and
 * each runs up to `--checkers` type-checkers. The two multiply, so peak
 * parallelism (and memory) is roughly `builders * checkers`.
 *
 * Defaults are derived from the host core count; both are env-overridable so a
 * CI step can tune them per machine profile without code changes.
 */
export const ENV_BUILDERS = 'KBN_TYPE_CHECK_BUILDERS';
export const ENV_CHECKERS = 'KBN_TYPE_CHECK_CHECKERS';
export const ENV_STOP_ON_ERRORS = 'KBN_TYPE_CHECK_STOP_ON_ERRORS';
export const ENV_MAX_OLD_SPACE = 'KBN_TYPE_CHECK_MAX_OLD_SPACE_MB';

/** Upper bound so a many-core machine doesn't spawn an unreasonable builder count. */
const MAX_DEFAULT_BUILDERS = 16;
const DEFAULT_CHECKERS = 2;
const DEFAULT_MAX_OLD_SPACE_MB = 12288;

export interface TypeCheckConcurrency {
  builders: number;
  checkers: number;
  stopOnErrors: boolean;
}

/** Resolves tsgo build concurrency from env overrides, defaulting from core count. */
export const resolveTypeCheckConcurrency = (
  env: NodeJS.ProcessEnv = process.env,
  cpuCount: number = Os.cpus().length
): TypeCheckConcurrency => {
  const cores = Math.max(1, cpuCount);
  return {
    builders: readPositiveInt(env[ENV_BUILDERS], Math.min(cores, MAX_DEFAULT_BUILDERS)),
    checkers: readPositiveInt(env[ENV_CHECKERS], DEFAULT_CHECKERS),
    stopOnErrors: readBoolean(env[ENV_STOP_ON_ERRORS]),
  };
};

/** Resolves the Node heap budget (MB) for the tsgo process, env-overridable. */
export const resolveMaxOldSpaceMb = (env: NodeJS.ProcessEnv = process.env): number =>
  readPositiveInt(env[ENV_MAX_OLD_SPACE], DEFAULT_MAX_OLD_SPACE_MB);

/** Builds the `tsgo -b` concurrency CLI args from resolved values. */
export const buildConcurrencyArgs = (concurrency: TypeCheckConcurrency): string[] => {
  const args = [
    '--builders',
    String(concurrency.builders),
    '--checkers',
    String(concurrency.checkers),
  ];
  if (concurrency.stopOnErrors) {
    args.push('--stopBuildOnErrors');
  }
  return args;
};

function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readBoolean(raw: string | undefined): boolean {
  return raw !== undefined && /^(1|true)$/i.test(raw.trim());
}
