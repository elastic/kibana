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
const isStringArray = (arr: unknown | string[]): arr is string[] =>
  Array.isArray(arr) && arr.every((p) => typeof p === 'string');

const normalizeStringList = (value: unknown | string[], flagName: string) => {
  if (!value) {
    return undefined;
  }

  const normalized = typeof value === 'string' ? [value] : value;

  if (!isStringArray(normalized)) {
    throw createFlagError(`expected --${flagName} must only contain strings`);
  }

  return normalized;
};

const dedupe = (values: string[] | undefined) =>
  values && values.length > 0 ? Array.from(new Set(values)) : undefined;

const VALID_CHECKS = ['any', 'comments', 'exports', 'all'] as const;

const normalizeCheckFlagValues = (check: unknown | string[]) => {
  if (!check) {
    return undefined;
  }

  if (typeof check === 'string') {
    return [check];
  }

  if (!isStringArray(check)) {
    throw createFlagError(
      'expected --check must only contain `any`, `comments`, `exports`, or `all`'
    );
  }

  return check;
};

const expandChecks = (checks: string[] | undefined) => {
  if (!checks) {
    return undefined;
  }

  const expanded = checks.flatMap((c) => (c === 'all' ? ['any', 'comments', 'exports'] : [c]));

  const invalid = expanded.find((c) => !VALID_CHECKS.includes(c as (typeof VALID_CHECKS)[number]));
  if (invalid) {
    throw createFlagError(
      'expected --check must only contain `any`, `comments`, `exports`, or `all`'
    );
  }

  return expanded;
};

const validateStats = (stats: string[] | undefined) => {
  if (stats && stats.find((s) => s !== 'any' && s !== 'comments' && s !== 'exports')) {
    throw createFlagError('expected --stats must only contain `any`, `comments` and/or `exports`');
  }
};

const normalizeStats = (value: unknown | string[]) => {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (!isStringArray(value)) {
    throw createFlagError('expected --stats must only contain `any`, `comments` and/or `exports`');
  }

  return value;
};

/**
 * Parses and validates CLI flags, normalizing them into a consistent format.
 *
 * @param flags - Raw flags from the CLI runner.
 * @returns Validated and normalized CLI options.
 * @throws {Error} If flags are invalid.
 */
export function parseCliFlags(flags: CliFlags): CliOptions {
  const collectReferences = flags.references === true;
  const pluginFilter = dedupe(normalizeStringList(flags.plugin, 'plugin'));
  const packageFilter = dedupe(normalizeStringList(flags.package, 'package'));
  const rawStats = normalizeStats(flags.stats);
  const rawChecks = normalizeCheckFlagValues(flags.check);
  const expandedChecks = expandChecks(rawChecks);
  const stats = dedupe([...(rawStats ?? []), ...(expandedChecks ?? [])]);

  validateStats(stats);

  return {
    collectReferences,
    stats,
    pluginFilter,
    packageFilter,
  };
}
