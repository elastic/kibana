/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fastGlob from 'fast-glob';
import path from 'path';
import type { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import fs from 'fs';
import yaml from 'js-yaml';
import { createFailError } from '@kbn/dev-cli-errors';
import { KIBANA_SOLUTIONS } from '@kbn/projects-solutions-groups';

export const DEFAULT_TEST_PATH_PATTERNS = [
  'src/platform/plugins',
  'src/platform/packages',
  'x-pack/**/plugins',
  'x-pack/**/packages',
];

interface ScoutTestDiscoveryConfig {
  group: string;
  path: string;
  usesParallelWorkers: boolean;
  configs: string[];
  type: 'plugin' | 'package';
}

export const getScoutPlaywrightConfigs = (searchPaths: string[], log: ToolingLog) => {
  const patterns = searchPaths.map((basePath) =>
    path.join(
      basePath,
      '**/test/scout/{ui,api}/{playwright.config.ts,parallel.playwright.config.ts}'
    )
  );

  log.info('Searching for Playwright config files in the following paths:');
  patterns.forEach((pattern) => log.info(`- ${pattern}`));
  log.info(''); // Add a newline for better readability

  const files = patterns.flatMap((pattern) => fastGlob.sync(pattern, { onlyFiles: true }));

  const typeMappings: Record<string, string> = {
    ...KIBANA_SOLUTIONS.reduce<Record<string, string>>((agg, solution) => {
      agg[`x-pack/solutions/${solution}`] = solution;
      return agg;
    }, {}),
    'x-pack/platform/plugins': 'platform',
    'x-pack/platform/packages': 'platform',
    'src/platform/plugins': 'platform',
    'src/platform/packages': 'platform',
  };

  const matchDirPath = (
    filePath: string
  ): { path: string; name: string; type: 'plugin' | 'package' } | null => {
    const regexes = [
      // Plugin patterns
      {
        regex: /(x-pack\/platform\/plugins\/(?:private|shared|[^\/]+)\/([^\/]+))\/test\/scout\//,
        type: 'plugin' as const,
      },
      {
        regex: /(x-pack\/solutions\/[^\/]+\/plugins\/([^\/]+))\/test\/scout\//,
        type: 'plugin' as const,
      }, // covers all Kibana solutions
      {
        regex: /(src\/platform\/plugins\/(?:private|shared)?\/?([^\/]+))\/test\/scout\//,
        type: 'plugin' as const,
      },
      // Package patterns
      {
        regex: /(x-pack\/platform\/packages\/(?:private|shared|[^\/]+)\/([^\/]+))\/test\/scout\//,
        type: 'package' as const,
      },
      {
        regex: /(x-pack\/solutions\/[^\/]+\/packages\/([^\/]+))\/test\/scout\//,
        type: 'package' as const,
      }, // covers all Kibana solutions
      {
        regex: /(src\/platform\/packages\/(?:private|shared)\/([^\/]+))\/test\/scout\//,
        type: 'package' as const,
      },
    ];

    for (const { regex, type } of regexes) {
      const match = filePath.match(regex);
      if (match) {
        return { path: match[1], name: match[2], type };
      }
    }
    return null;
  };

  const scoutConfigMap = new Map<string, ScoutTestDiscoveryConfig>();

  files.forEach((filePath) => {
    const matchResult = matchDirPath(filePath);
    if (!matchResult) {
      log.warning(`Unable to extract plugin/package name from path: ${filePath}`);
      return;
    }

    const { path: itemPath, name: itemName, type } = matchResult;
    const group =
      Object.entries(typeMappings).find(([key]) => filePath.includes(key))?.[1] || 'unknown';

    if (!scoutConfigMap.has(itemName)) {
      scoutConfigMap.set(itemName, {
        group,
        path: itemPath,
        configs: [],
        usesParallelWorkers: false,
        type,
      });
    }

    const itemData = scoutConfigMap.get(itemName)!;
    if (!itemData.configs.includes(filePath)) {
      itemData.configs.push(filePath);
      if (filePath.endsWith('parallel.playwright.config.ts')) {
        itemData.usesParallelWorkers = true;
      }
    }
  });

  return scoutConfigMap;
};

export const validateWithScoutCiConfig = (
  log: ToolingLog,
  scoutConfigMap: Map<string, ScoutTestDiscoveryConfig>
) => {
  const scoutCiConfigRelPath = path.join('.buildkite', 'scout_ci_config.yml');
  const scoutCiConfigPath = path.resolve(REPO_ROOT, scoutCiConfigRelPath);
  const ciConfig = yaml.load(fs.readFileSync(scoutCiConfigPath, 'utf8')) as {
    plugins: {
      enabled?: string[];
      disabled?: string[];
    };
    packages: {
      enabled?: string[];
      disabled?: string[];
    };
  };

  const enabledPlugins = new Set(ciConfig.plugins.enabled || []);
  const disabledPlugins = new Set(ciConfig.plugins.disabled || []);
  const enabledPackages = new Set(ciConfig.packages.enabled || []);
  const disabledPackages = new Set(ciConfig.packages.disabled || []);

  const allRegisteredPlugins = new Set([...enabledPlugins, ...disabledPlugins]);
  const allRegisteredPackages = new Set([...enabledPackages, ...disabledPackages]);

  const unregisteredItems: string[] = [];
  const runnableConfigs = new Map<string, ScoutTestDiscoveryConfig>();

  for (const [title, config] of scoutConfigMap.entries()) {
    const isPlugin = config.type === 'plugin';
    const isPackage = config.type === 'package';

    if (isPlugin && !allRegisteredPlugins.has(title)) {
      unregisteredItems.push(`${title} (plugin)`);
    } else if (isPackage && !allRegisteredPackages.has(title)) {
      unregisteredItems.push(`${title} (package)`);
    } else if (
      (isPlugin && enabledPlugins.has(title)) ||
      (isPackage && enabledPackages.has(title))
    ) {
      runnableConfigs.set(title, config);
    }
  }

  if (unregisteredItems.length > 0) {
    throw createFailError(
      `The following plugin(s)/package(s) are not listed in Scout CI config '${scoutCiConfigRelPath}':\n${unregisteredItems
        .map((item) => {
          return `- ${item}`;
        })
        .join('\n')}\nRead more: src/platform/packages/shared/kbn-scout/README.md`
    );
  }

  const allDisabled = [...disabledPlugins, ...disabledPackages];
  if (allDisabled.length > 0) {
    log.warning(
      `The following plugin(s)/package(s) are disabled in '${scoutCiConfigRelPath}' and will be excluded from CI run\n${allDisabled
        .map((item) => {
          return `- ${item}`;
        })
        .join('\n')}`
    );
  }

  return runnableConfigs;
};
