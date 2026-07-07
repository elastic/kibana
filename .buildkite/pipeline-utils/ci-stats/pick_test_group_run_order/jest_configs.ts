/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as globby from 'globby';

import DISABLED_JEST_CONFIGS from '../../../disabled_jest_configs.json';

/** Discover Jest unit configs honoring LIMIT_SOLUTIONS and the disabled list. */
export function discoverJestUnitConfigs(limitSolutions: string[] | undefined): string[] {
  return globJestConfigs(['**/jest.config.js', '!**/__fixtures__/**'], limitSolutions);
}

/** Discover Jest integration configs honoring LIMIT_SOLUTIONS and the disabled list. */
export function discoverJestIntegrationConfigs(limitSolutions: string[] | undefined): string[] {
  return globJestConfigs(['**/jest.integration.config.js', '!**/__fixtures__/**'], limitSolutions);
}

function globJestConfigs(patterns: string[], limitSolutions: string[] | undefined): string[] {
  return globby.sync(globsForSolutions(patterns, limitSolutions), {
    cwd: process.cwd(),
    absolute: false,
    ignore: [...DISABLED_JEST_CONFIGS, '**/node_modules/**'],
  });
}

/**
 * When LIMIT_SOLUTIONS is set, restrict the glob to those solutions while
 * still allowing platform tests (`src/`, `x-pack/platform/`) to run.
 *
 * Negation patterns (starting with `!`) must keep `!` as their first character
 * to be treated as exclusions by globby, so they are passed through unchanged
 * and applied globally across all prefixed positive patterns.
 */
export function globsForSolutions(
  patterns: string[],
  limitSolutions: string[] | undefined
): string[] {
  if (!limitSolutions) {
    return patterns;
  }

  const positivePatterns = patterns.filter((p) => !p.startsWith('!'));
  const negationPatterns = patterns.filter((p) => p.startsWith('!'));

  const platformPatterns = ['src/', 'x-pack/platform/'].flatMap((platformPrefix) =>
    positivePatterns.map((pattern) => `${platformPrefix}${pattern}`)
  );

  return limitSolutions
    .flatMap((solution) => positivePatterns.map((p) => `x-pack/solutions/${solution}/${p}`))
    .concat(platformPatterns)
    .concat(negationPatterns);
}
