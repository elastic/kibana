/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import type { CliFlags, CliOptions } from './types';

/**
 * Validates that an array contains only strings.
 */
function isStringArray(arr: unknown | string[]): arr is string[] {
  return Array.isArray(arr) && arr.every((p) => typeof p === 'string');
}

/**
 * Parses and validates CLI flags, normalizing them into a consistent format.
 *
 * @param flags - Raw flags from the CLI runner.
 * @returns Validated and normalized CLI options.
 * @throws {Error} If flags are invalid.
 */
export function parseCliFlags(flags: CliFlags): CliOptions {
  const collectReferences = flags.references === true;
  const stats = flags.stats && typeof flags.stats === 'string' ? [flags.stats] : flags.stats;
  const pluginFilter =
    flags.plugin && typeof flags.plugin === 'string'
      ? [flags.plugin]
      : (flags.plugin as string[] | undefined);

  if (pluginFilter && !isStringArray(pluginFilter)) {
    throw createFlagError('expected --plugin must only contain strings');
  }

  if (
    (stats &&
      isStringArray(stats) &&
      stats.find((s) => s !== 'any' && s !== 'comments' && s !== 'exports')) ||
    (stats && !isStringArray(stats))
  ) {
    throw createFlagError('expected --stats must only contain `any`, `comments` and/or `exports`');
  }

  return {
    collectReferences,
    stats: stats && isStringArray(stats) ? stats : undefined,
    pluginFilter,
  };
}
