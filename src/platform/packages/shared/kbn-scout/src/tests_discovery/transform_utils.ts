/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlattenedConfigGroup, ModuleDiscoveryInfo } from './types';

// Counts modules by type (plugins and packages)
export const countModulesByType = (
  modules: ModuleDiscoveryInfo[]
): { plugins: number; packages: number } => {
  let plugins = 0;
  let packages = 0;
  for (const module of modules) {
    if (module.type === 'plugin') {
      plugins++;
    } else {
      packages++;
    }
  }
  return { plugins, packages };
};

/**
 * Flattens ModuleDiscoveryInfo[] into an array grouped by mode, group, and runMode
 * for qaf-tests run
 */
export const flattenModulesByRunMode = (modules: ModuleDiscoveryInfo[]): FlattenedConfigGroup[] => {
  // Using a map with composite key: `${mode}:${group}:${runMode}`
  const groupsMap = new Map<string, FlattenedConfigGroup>();

  for (const module of modules) {
    for (const config of module.configs) {
      for (const runMode of config.runModes) {
        const mode: 'serverless' | 'stateful' = runMode.startsWith('--serverless')
          ? 'serverless'
          : 'stateful';

        const key = `${mode}:${module.group}:${runMode}`;

        // Get or create group
        let group = groupsMap.get(key);
        if (!group) {
          group = {
            mode,
            group: module.group,
            runMode,
            configs: [],
          };
          groupsMap.set(key, group);
        }

        // Add config path to group
        group.configs.push(config.path);
      }
    }
  }

  // Convert map to array and sort for consistent output
  return Array.from(groupsMap.values()).sort((a, b) => {
    // Sort by mode first (stateful before serverless), then by group, then by runMode (alphabetical)
    if (a.mode !== b.mode) {
      return a.mode === 'stateful' ? -1 : 1;
    }
    if (a.group !== b.group) {
      return a.group.localeCompare(b.group);
    }
    return a.runMode.localeCompare(b.runMode);
  });
};
