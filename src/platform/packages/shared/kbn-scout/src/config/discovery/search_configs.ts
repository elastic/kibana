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
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import fs from 'fs';
import yaml from 'js-yaml';
import { createFailError } from '@kbn/dev-cli-errors';
import { KIBANA_SOLUTIONS } from '@kbn/projects-solutions-groups';

export const DEFAULT_TEST_PATH_PATTERNS = ['src/platform/plugins', 'x-pack/**/plugins'];

interface PluginScoutConfig {
  group: string;
  pluginPath: string;
  usesParallelWorkers: boolean;
  configs: string[];
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
    'src/platform/plugins': 'platform',
  };

  const matchPluginPath = (filePath: string): { pluginPath: string; pluginName: string } | null => {
    const regexes = [
      /(x-pack\/platform\/plugins\/(?:private|shared|[^\/]+)\/([^\/]+))\/test\/scout\//,
      /(x-pack\/solutions\/[^\/]+\/plugins\/([^\/]+))\/test\/scout\//, // covers all Kibana solutions
      /(src\/platform\/plugins\/(?:private|shared)?\/?([^\/]+))\/test\/scout\//,
    ];

    for (const regex of regexes) {
      const match = filePath.match(regex);
      if (match) {
        return { pluginPath: match[1], pluginName: match[2] };
      }
    }
    return null;
  };

  const pluginsWithConfigs = new Map<string, PluginScoutConfig>();

  files.forEach((filePath) => {
    const matchResult = matchPluginPath(filePath);
    if (!matchResult) {
      log.warning(`Unable to extract plugin name from path: ${filePath}`);
      return;
    }

    const { pluginPath, pluginName } = matchResult;
    const group =
      Object.entries(typeMappings).find(([key]) => filePath.includes(key))?.[1] || 'unknown';

    if (!pluginsWithConfigs.has(pluginName)) {
      pluginsWithConfigs.set(pluginName, {
        group,
        pluginPath,
        configs: [],
        usesParallelWorkers: false,
      });
    }

    const pluginData = pluginsWithConfigs.get(pluginName)!;
    if (!pluginData.configs.includes(filePath)) {
      pluginData.configs.push(filePath);
      if (filePath.endsWith('parallel.playwright.config.ts')) {
        pluginData.usesParallelWorkers = true;
      }
    }
  });

  return pluginsWithConfigs;
};

export const validateWithScoutCiConfig = (
  log: ToolingLog,
  pluginsWithConfigs: Map<string, PluginScoutConfig>
) => {
  const scoutCiConfigRelPath = path.join('.buildkite', 'scout_ci_config.yml');
  const scoutCiConfigPath = path.resolve(REPO_ROOT, scoutCiConfigRelPath);
  const ciConfig = yaml.load(fs.readFileSync(scoutCiConfigPath, 'utf8')) as {
    ui_tests: {
      enabled?: string[];
      disabled?: string[];
    };
  };

  const enabledPlugins = new Set(ciConfig.ui_tests.enabled || []);
  const disabledPlugins = new Set(ciConfig.ui_tests.disabled || []);
  const allRegisteredPlugins = new Set([...enabledPlugins, ...disabledPlugins]);

  const unregisteredPlugins: string[] = [];
  const runnablePlugins = new Map<string, PluginScoutConfig>();

  for (const [pluginName, config] of pluginsWithConfigs.entries()) {
    if (!allRegisteredPlugins.has(pluginName)) {
      unregisteredPlugins.push(pluginName);
    } else if (enabledPlugins.has(pluginName)) {
      runnablePlugins.set(pluginName, config);
    }
  }

  if (unregisteredPlugins.length > 0) {
    throw createFailError(
      `The following plugins are not registered in Scout CI config '${scoutCiConfigRelPath}':\n${unregisteredPlugins
        .map((plugin) => {
          return `- ${plugin}`;
        })
        .join('\n')}\nRead more: src/platform/packages/shared/kbn-scout/README.md`
    );
  }

  if (disabledPlugins.size > 0) {
    log.warning(
      `The following plugins are disabled in '${scoutCiConfigRelPath}' and will be excluded from CI run\n${[
        ...disabledPlugins,
      ]
        .map((plugin) => {
          return `- ${plugin}`;
        })
        .join('\n')}`
    );
  }

  return runnablePlugins;
};
