/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import dedent from 'dedent';
import { parse, stringify } from 'yaml';
import { createFailError } from '@kbn/dev-cli-errors';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CiStatsMetric } from '@kbn/ci-stats-reporter';
import { getSharedChunkNames } from './config/split_chunks';

export interface Limits {
  pageLoadAssetSize?: Record<string, number | undefined>;
}

export const DEFAULT_LIMITS_PATH = Path.resolve(__dirname, '../limits.yml');

const DEFAULT_BUDGET_FRACTION = 0.1;

const diff = <T>(a: T[], b: T[]): T[] => a.filter((item) => !b.includes(item));

export function readLimits(path: string): Limits {
  let yaml;
  try {
    yaml = Fs.readFileSync(path, 'utf8');
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return yaml ? (parse(yaml) as Limits) : {};
}

export function validateLimitsForAllBundles(
  log: ToolingLog,
  pluginIds: string[],
  limitsPath: string
) {
  const limitBundleIds = Object.keys(readLimits(limitsPath).pageLoadAssetSize || {});

  const sharedChunkNames = getSharedChunkNames();
  const missingBundleIds = diff(pluginIds, limitBundleIds);
  const extraBundleIds = diff(limitBundleIds, pluginIds).filter((id) => !sharedChunkNames.has(id));

  const issues = [];
  if (missingBundleIds.length) {
    issues.push(`missing: ${missingBundleIds.join(', ')}`);
  }
  if (extraBundleIds.length) {
    issues.push(`extra: ${extraBundleIds.join(', ')}`);
  }
  if (issues.length) {
    throw createFailError(
      dedent`
        The limits defined in packages/kbn-rspack-optimizer/limits.yml are outdated. Please update
        this file with a limit (in bytes) for every production bundle.

          ${issues.join('\n          ')}

        To automatically update the limits file locally run:

          node scripts/build_rspack_bundles --update-limits

        To validate your changes locally run:

          node scripts/build_rspack_bundles --validate-limits
      ` + '\n'
    );
  }

  const sorted = limitBundleIds
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .every((key, i) => limitBundleIds[i] === key);
  if (!sorted) {
    throw createFailError(
      dedent`
        The limits defined in packages/kbn-rspack-optimizer/limits.yml are not sorted correctly. To make
        sure the file is automatically updatable without dozens of extra changes, the keys in this
        file must be sorted.

        Please sort the keys alphabetically or, to automatically update the limits file locally run:

          node scripts/build_rspack_bundles --update-limits

        To validate your changes locally run:

          node scripts/build_rspack_bundles --validate-limits
      ` + '\n'
    );
  }

  log.success('limits.yml file valid');
}

/** Max measured overage (value vs existing limit) tolerated by the CI auto-fix; matches the 15% tripwire in the bundle-size-limits-comment workflow. */
export const DEFAULT_MAX_LIMIT_INCREASE_FRACTION = 0.15;

export interface UpdateBundleLimitsOptions {
  /** Refuse to write when a measured size exceeds its limit by more than this fraction. */
  maxIncreaseFraction?: number;
  /** Only rewrite entries whose measured value exceeds the existing limit, leaving all other entries untouched. */
  onlyOverages?: boolean;
}

/**
 * Read metrics.json from the build output, compute limits (110% of measured size),
 * and write a sorted limits.yml file.
 *
 * Unlike legacy's `dropMissing` parameter, this always starts from an empty
 * object because `--update-limits` always runs a full dist build with all
 * plugins included. Stale entries for removed plugins are cleaned out
 * automatically since only plugins present in metrics.json get entries.
 */
export function updateBundleLimits(
  log: ToolingLog,
  metricsPath: string,
  limitsPath: string,
  options: UpdateBundleLimitsOptions = {}
) {
  const { maxIncreaseFraction, onlyOverages = false } = options;
  const existingLimits = readLimits(limitsPath);
  const metrics: CiStatsMetric[] = JSON.parse(Fs.readFileSync(metricsPath, 'utf-8'));

  const pageLoadAssetSize: NonNullable<Limits['pageLoadAssetSize']> = onlyOverages
    ? { ...existingLimits.pageLoadAssetSize }
    : {};
  const increases: Array<{ id: string; previousLimit: number; newLimit: number; value: number }> =
    [];

  for (const metric of metrics) {
    if (metric.group !== 'page load bundle size') continue;

    const existingLimit = existingLimits.pageLoadAssetSize?.[metric.id];

    if (onlyOverages) {
      // rewrite only actual overages so the CI auto-commit diff stays minimal
      if (existingLimit == null || metric.value <= existingLimit) continue;

      const newLimit = Math.floor(metric.value * (1 + DEFAULT_BUDGET_FRACTION));
      increases.push({
        id: metric.id,
        previousLimit: existingLimit,
        newLimit,
        value: metric.value,
      });
      pageLoadAssetSize[metric.id] = newLimit;
      continue;
    }

    const newLimit = Math.floor(metric.value * (1 + DEFAULT_BUDGET_FRACTION));

    const shouldKeepExisting =
      existingLimit != null && existingLimit >= metric.value && existingLimit < newLimit;
    const limit = shouldKeepExisting ? existingLimit : newLimit;

    if (existingLimit != null && limit > existingLimit) {
      increases.push({
        id: metric.id,
        previousLimit: existingLimit,
        newLimit: limit,
        value: metric.value,
      });
    }

    pageLoadAssetSize[metric.id] = limit;
  }

  if (onlyOverages && increases.length === 0) {
    log.info('no limit overages found in metrics, limits file left unchanged');
    return;
  }

  if (maxIncreaseFraction !== undefined) {
    const tooLarge = increases.filter(
      ({ previousLimit, value }) => (value - previousLimit) / previousLimit > maxIncreaseFraction
    );
    if (tooLarge.length) {
      const rows = tooLarge
        .map(
          ({ id, previousLimit, value, newLimit }) =>
            `${id}: measured ${value} exceeds limit ${previousLimit} by ${(
              ((value - previousLimit) / previousLimit) *
              100
            ).toFixed(1)}% (new limit would be ${newLimit})`
        )
        .join('\n          ');
      throw createFailError(
        dedent`
          Refusing to update ${limitsPath}: the following bundles exceed their limit
          by more than ${Math.round(maxIncreaseFraction * 100)}%, which needs a human review:

            ${rows}

          To update the limits anyway, run a full dist build locally:

            node scripts/build_rspack_bundles --update-limits
        ` + '\n'
      );
    }
  }

  const sortedPageLoadAssetSize: NonNullable<Limits['pageLoadAssetSize']> = {};
  for (const key of Object.keys(pageLoadAssetSize).sort((a, b) => a.localeCompare(b))) {
    sortedPageLoadAssetSize[key] = pageLoadAssetSize[key];
  }

  const newLimits: Limits = {
    pageLoadAssetSize: sortedPageLoadAssetSize,
  };

  Fs.writeFileSync(limitsPath, stringify(newLimits));
  log.success(`wrote updated limits to ${limitsPath}`);
}
