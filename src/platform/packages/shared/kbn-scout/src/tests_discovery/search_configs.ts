/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import type { ModuleDiscoveryInfo } from './types';

interface ScoutCiConfig {
  plugins: {
    enabled?: string[];
    disabled?: string[];
  };
  packages: {
    enabled?: string[];
    disabled?: string[];
  };
  excluded_configs?: string[];
}

const readScoutCiConfig = (): ScoutCiConfig => {
  const scoutCiConfigRelPath = path.join('.buildkite', 'scout_ci_config.yml');
  const scoutCiConfigPath = path.resolve(REPO_ROOT, scoutCiConfigRelPath);
  return yaml.load(fs.readFileSync(scoutCiConfigPath, 'utf8')) as ScoutCiConfig;
};

export const getScoutCiExcludedConfigs = (): string[] => {
  const ciConfig = readScoutCiConfig();
  return ciConfig.excluded_configs ?? [];
};

/**
 * Filters modules based on Scout CI configuration.
 * Validates that all modules are registered in the CI config ('scout_ci_config.yml') and
 * returns only enabled modules.
 * Throws an error if any module with Scout tests is not registered in the CI config.
 *
 * @param log - Tooling log instance for warnings
 * @param modulesWithTests - Array of modules to filter
 * @returns Filtered array containing only enabled modules
 */
export const filterModulesByScoutCiConfig = (
  log: ToolingLog,
  modulesWithTests: ModuleDiscoveryInfo[]
): ModuleDiscoveryInfo[] => {
  const scoutCiConfigRelPath = path.join('.buildkite', 'scout_ci_config.yml');
  const ciConfig = readScoutCiConfig();

  const enabledPlugins = new Set(ciConfig.plugins.enabled || []);
  const disabledPlugins = new Set(ciConfig.plugins.disabled || []);
  const enabledPackages = new Set(ciConfig.packages.enabled || []);
  const disabledPackages = new Set(ciConfig.packages.disabled || []);

  const allDisabled = new Set([...disabledPlugins, ...disabledPackages]);
  const allRegisteredPlugins = new Set([...enabledPlugins, ...disabledPlugins]);
  const allRegisteredPackages = new Set([...enabledPackages, ...disabledPackages]);

  const unregisteredItems: string[] = [];
  const filteredOutDisabledItems: string[] = [];

  const filteredModulesWithTests = modulesWithTests.filter((module) => {
    if (module.type === 'plugin') {
      if (!allRegisteredPlugins.has(module.name)) {
        unregisteredItems.push(`${module.name} (plugin)`);
        return false;
      }
      if (allDisabled.has(module.name)) {
        filteredOutDisabledItems.push(`${module.name} (plugin)`);
        return false;
      }
      return true;
    } else {
      // module.type === 'package'
      if (!allRegisteredPackages.has(module.name)) {
        unregisteredItems.push(`${module.name} (package)`);
        return false;
      }
      if (allDisabled.has(module.name)) {
        filteredOutDisabledItems.push(`${module.name} (package)`);
        return false;
      }
      return true;
    }
  });

  if (unregisteredItems.length > 0) {
    throw createFailError(
      `The following plugin(s)/package(s) are not registered in Scout CI config '${scoutCiConfigRelPath}':\n${unregisteredItems
        .map((item) => `- ${item}`)
        .join('\n')}\nRead more: src/platform/packages/shared/kbn-scout/README.md`
    );
  }

  if (filteredOutDisabledItems.length > 0) {
    log.warning(
      `The following plugin(s)/package(s) are disabled in '${scoutCiConfigRelPath}' and will be excluded from CI:\n${filteredOutDisabledItems
        .map((item) => `- ${item}`)
        .join('\n')}`
    );
  }

  return filteredModulesWithTests;
};
