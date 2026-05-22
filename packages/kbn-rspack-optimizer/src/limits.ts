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
import Yaml from 'js-yaml';
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

  return yaml ? (Yaml.load(yaml) as Limits) : {};
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

/**
 * Read metrics.json from the build output, compute limits (110% of measured size),
 * and write a sorted limits.yml file.
 *
 * Unlike legacy's `dropMissing` parameter, this always starts from an empty
 * object because `--update-limits` always runs a full dist build with all
 * plugins included. Stale entries for removed plugins are cleaned out
 * automatically since only plugins present in metrics.json get entries.
 */
export function updateBundleLimits(log: ToolingLog, metricsPath: string, limitsPath: string) {
  const existingLimits = readLimits(limitsPath);
  const metrics: CiStatsMetric[] = JSON.parse(Fs.readFileSync(metricsPath, 'utf-8'));

  const pageLoadAssetSize: NonNullable<Limits['pageLoadAssetSize']> = {};

  for (const metric of metrics) {
    if (metric.group !== 'page load bundle size') continue;

    const existingLimit = existingLimits.pageLoadAssetSize?.[metric.id];
    const newLimit = Math.floor(metric.value * (1 + DEFAULT_BUDGET_FRACTION));

    const shouldKeepExisting =
      existingLimit != null && existingLimit >= metric.value && existingLimit < newLimit;

    pageLoadAssetSize[metric.id] = shouldKeepExisting ? existingLimit : newLimit;
  }

  const sortedPageLoadAssetSize: NonNullable<Limits['pageLoadAssetSize']> = {};
  for (const key of Object.keys(pageLoadAssetSize).sort((a, b) => a.localeCompare(b))) {
    sortedPageLoadAssetSize[key] = pageLoadAssetSize[key];
  }

  const newLimits: Limits = {
    pageLoadAssetSize: sortedPageLoadAssetSize,
  };

  Fs.writeFileSync(limitsPath, Yaml.dump(newLimits));
  log.success(`wrote updated limits to ${limitsPath}`);
}
