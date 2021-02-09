/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';

import dedent from 'dedent';
import Yaml from 'js-yaml';
import { createFailError, ToolingLog, CiStatsMetrics } from '@kbn/dev-utils';

import { OptimizerConfig, Limits } from './optimizer';

const LIMITS_PATH = require.resolve('../limits.yml');
const DEFAULT_BUDGET = 15000;

const diff = <T>(a: T[], b: T[]): T[] => a.filter((item) => !b.includes(item));

export function readLimits(): Limits {
  let yaml;
  try {
    yaml = Fs.readFileSync(LIMITS_PATH, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  return yaml ? Yaml.safeLoad(yaml) : {};
}

export function validateLimitsForAllBundles(log: ToolingLog, config: OptimizerConfig) {
  const limitBundleIds = Object.keys(readLimits().pageLoadAssetSize || {});
  const configBundleIds = config.bundles.map((b) => b.id);

  const missingBundleIds = diff(configBundleIds, limitBundleIds);
  const extraBundleIds = diff(limitBundleIds, configBundleIds);

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
        The limits defined in packages/kbn-optimizer/limits.yml are outdated. Please update
        this file with a limit (in bytes) for every production bundle.

          ${issues.join('\n          ')}

        To automatically update the limits file locally run:

          node scripts/build_kibana_platform_plugins.js --update-limits

        To validate your changes locally run:

          node scripts/build_kibana_platform_plugins.js --validate-limits
      ` + '\n'
    );
  }

  log.success('limits.yml file valid');
}

interface UpdateBundleLimitsOptions {
  log: ToolingLog;
  config: OptimizerConfig;
  dropMissing: boolean;
}

export function updateBundleLimits({ log, config, dropMissing }: UpdateBundleLimitsOptions) {
  const limits = readLimits();
  const metrics: CiStatsMetrics = config.bundles
    .map((bundle) =>
      JSON.parse(Fs.readFileSync(Path.resolve(bundle.outputDir, 'metrics.json'), 'utf-8'))
    )
    .flat()
    .sort((a, b) => a.id.localeCompare(b.id));

  const pageLoadAssetSize: NonNullable<Limits['pageLoadAssetSize']> = dropMissing
    ? {}
    : limits.pageLoadAssetSize ?? {};

  for (const metric of metrics) {
    if (metric.group === 'page load bundle size') {
      const existingLimit = limits.pageLoadAssetSize?.[metric.id];
      pageLoadAssetSize[metric.id] =
        existingLimit != null && existingLimit >= metric.value
          ? existingLimit
          : metric.value + DEFAULT_BUDGET;
    }
  }

  const newLimits: Limits = {
    pageLoadAssetSize,
  };

  Fs.writeFileSync(LIMITS_PATH, Yaml.safeDump(newLimits));
  log.success(`wrote updated limits to ${LIMITS_PATH}`);
}
