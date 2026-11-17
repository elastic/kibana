/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import dedent from 'dedent';
import { parse, stringify } from 'yaml';
import { createFailError } from '@kbn/dev-cli-errors';

export interface TaskBundleLimits {
  /** Bundle name (`buildTaskBundles`' `entry.name`) to its `--no-contributions` byte budget. */
  floor?: Record<string, number | undefined>;
  /** Pack id (manifest `packs[].id`) to its own byte budget. */
  packs?: Record<string, number | undefined>;
}

/** What a budget is checked against: the floor build's bytes per bundle, and every pack's bytes. */
export interface TaskBundleMeasurements {
  floor: Record<string, number>;
  packs: Record<string, number>;
}

export const DEFAULT_TASK_BUNDLE_LIMITS_PATH = path.resolve(__dirname, 'limits.yml');

const DEFAULT_BUDGET_FRACTION = 0.1;
const DEFAULT_MAX_LIMIT_INCREASE_FRACTION = 0.15;

const diff = <T>(a: T[], b: T[]): T[] => a.filter((item) => !b.includes(item));
const sortRecord = (record: Record<string, number | undefined>): Record<string, number> => {
  const sorted: Record<string, number> = {};
  for (const key of Object.keys(record).sort((a, b) => a.localeCompare(b))) {
    const value = record[key];
    if (value !== undefined) sorted[key] = value;
  }
  return sorted;
};

export const readTaskBundleLimits = (file: string): TaskBundleLimits => {
  let yamlSource;
  try {
    yamlSource = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return yamlSource ? (parse(yamlSource) as TaskBundleLimits) : {};
};

/**
 * Checks every measured floor and pack against `limits.yml`, the way
 * `@kbn/rspack-optimizer`'s `limits.ts` checks page load bundles: an id missing from the file, an
 * id in the file no measurement covers, unsorted keys, or a measurement over its budget are all
 * failures, so the floor and a pack's weight cannot grow back silently.
 */
export const validateTaskBundleLimits = (
  measurements: TaskBundleMeasurements,
  limits: TaskBundleLimits
): string[] => {
  const issues: string[] = [];
  for (const [kind, measured, limitRecord] of [
    ['floor', measurements.floor, limits.floor ?? {}],
    ['pack', measurements.packs, limits.packs ?? {}],
  ] as const) {
    const measuredIds = Object.keys(measured);
    const limitIds = Object.keys(limitRecord);
    const missing = diff(measuredIds, limitIds);
    const extra = diff(limitIds, measuredIds);
    if (missing.length) issues.push(`${kind}: missing a limit for ${missing.join(', ')}`);
    if (extra.length) issues.push(`${kind}: limit for ${extra.join(', ')} has no measurement`);
    const sortedIds = [...limitIds].sort((a, b) => a.localeCompare(b));
    if (!sortedIds.every((id, i) => limitIds[i] === id)) {
      issues.push(`${kind}: limits.yml keys are not sorted alphabetically`);
    }
    for (const id of measuredIds) {
      const limit = limitRecord[id];
      const value = measured[id];
      if (limit !== undefined && value > limit) {
        issues.push(
          `${kind} "${id}": ${value} bytes exceeds its budget of ${limit} bytes (${(
            ((value - limit) / limit) *
            100
          ).toFixed(1)}% over)`
        );
      }
    }
  }
  return issues;
};

/** Throws with a message pointing at the fix, the same shape as the optimizer's limits failure. */
export const assertTaskBundleLimits = (
  measurements: TaskBundleMeasurements,
  limitsPath: string = DEFAULT_TASK_BUNDLE_LIMITS_PATH
): void => {
  const issues = validateTaskBundleLimits(measurements, readTaskBundleLimits(limitsPath));
  if (!issues.length) return;
  throw createFailError(
    dedent`
      The limits defined in ${path.relative(process.cwd(), limitsPath)} are outdated or exceeded:

        ${issues.join('\n        ')}

      To automatically update the limits file locally run:

        node scripts/task_bundle --update-limits

      To validate without updating run:

        node scripts/task_bundle --validate-limits
    ` + '\n'
  );
};

export interface UpdateTaskBundleLimitsOptions {
  /** Refuse to write when a measured size exceeds its existing limit by more than this fraction. */
  maxIncreaseFraction?: number;
}

/**
 * Sets each id's limit to 110% of what it measures today (`DEFAULT_BUDGET_FRACTION`), keeping a
 * higher existing limit as long as it is still below that 110% ceiling, the same rule the
 * optimizer's `updateBundleLimits` uses for page load bundles. Refuses to raise a limit by more
 * than `maxIncreaseFraction` (15% by default) without a human reviewing the regression that caused
 * it, rather than silently writing whatever the floor or a pack now costs.
 */
export const updateTaskBundleLimits = (
  measurements: TaskBundleMeasurements,
  existingLimits: TaskBundleLimits,
  { maxIncreaseFraction = DEFAULT_MAX_LIMIT_INCREASE_FRACTION }: UpdateTaskBundleLimitsOptions = {}
): TaskBundleLimits => {
  const increases: Array<{ kind: string; id: string; previousLimit: number; value: number }> = [];
  const nextOf = (
    kind: string,
    measured: Record<string, number>,
    existing: Record<string, number | undefined>
  ): Record<string, number> => {
    const next: Record<string, number> = {};
    for (const [id, value] of Object.entries(measured)) {
      const existingLimit = existing[id];
      const budgeted = Math.ceil(value * (1 + DEFAULT_BUDGET_FRACTION));
      const keepExisting = existingLimit !== undefined && existingLimit >= value;
      const limit = keepExisting ? existingLimit! : budgeted;
      if (existingLimit !== undefined && limit > existingLimit) {
        increases.push({ kind, id, previousLimit: existingLimit, value });
      }
      next[id] = limit;
    }
    return next;
  };
  const nextFloor = nextOf('floor', measurements.floor, existingLimits.floor ?? {});
  const nextPacks = nextOf('pack', measurements.packs, existingLimits.packs ?? {});

  const tooLarge = increases.filter(
    ({ previousLimit, value }) => (value - previousLimit) / previousLimit > maxIncreaseFraction
  );
  if (tooLarge.length) {
    const rows = tooLarge
      .map(
        ({ kind, id, previousLimit, value }) =>
          `${kind} "${id}": measured ${value} exceeds limit ${previousLimit} by ${(
            ((value - previousLimit) / previousLimit) *
            100
          ).toFixed(1)}%`
      )
      .join('\n        ');
    throw createFailError(
      dedent`
        Refusing to update the limits: the following exceed their limit by more than
        ${Math.round(maxIncreaseFraction * 100)}%, which needs a human review:

          ${rows}
      ` + '\n'
    );
  }

  return { floor: sortRecord(nextFloor), packs: sortRecord(nextPacks) };
};

export const writeTaskBundleLimits = (
  limits: TaskBundleLimits,
  file: string = DEFAULT_TASK_BUNDLE_LIMITS_PATH
): void => {
  fs.writeFileSync(file, stringify(limits));
};

export interface TaskBundleWorkerSizeReport {
  bundle: string;
  floorBytes: number;
  packs: Array<{ id: string; bytes: number }>;
  /** Pack ids asked for that `limits.yml` has no measurement of: a run that would ask a worker to
   * load a pack this report cannot size, because the pack is new or `--update-limits` has not run
   * since it was added. */
  unmeasuredPackIds: string[];
  totalBytes: number;
}

/**
 * Reports what a worker running `bundle` with exactly `packIds` is expected to cost: the bundle's
 * floor plus each selected pack's own weight, both already measured in `limits.yml` (so this is a
 * lookup, not a build). Works for any task type's bundle and any pack ids, not only workflows',
 * since `limits.yml` budgets every bundle and pack the same way.
 */
export const reportTaskBundleWorkerSize = (
  limits: TaskBundleLimits,
  bundle: string,
  packIds: readonly string[]
): TaskBundleWorkerSizeReport => {
  const floorBytes = limits.floor?.[bundle];
  if (floorBytes === undefined) {
    throw new Error(
      `No floor measurement for bundle "${bundle}" in limits.yml; run node scripts/task_bundle --update-limits`
    );
  }
  const packs: Array<{ id: string; bytes: number }> = [];
  const unmeasuredPackIds: string[] = [];
  for (const id of packIds) {
    const bytes = limits.packs?.[id];
    if (bytes === undefined) unmeasuredPackIds.push(id);
    else packs.push({ id, bytes });
  }
  const totalBytes = floorBytes + packs.reduce((sum, pack) => sum + pack.bytes, 0);
  return { bundle, floorBytes, packs, unmeasuredPackIds, totalBytes };
};
