/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DeploymentType, FlattenedConfigGroup, ModuleDiscoveryInfo } from './types';

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
 * Determines deployment type for ECH (stateful) based on group
 * - 'platform' => 'classic'
 * - Other groups => solution name from group (e.g., 'search' => 'elasticsearch')
 */
const getDeploymentTypeForEch = (group: string): DeploymentType => {
  if (group === 'platform') {
    return 'classic';
  }
  // Map group to solution name
  if (group === 'search') {
    return 'elasticsearch';
  }
  if (group === 'security') {
    return 'security';
  }
  if (group === 'observability') {
    return 'observability';
  }

  throw new Error(`Unknown group '${group}' for ECH deployment type`);
};

/**
 * Determines deployment type for MKI (serverless) based on serverRunFlag
 */
const getDeploymentTypeForMki = (serverRunFlag: string): DeploymentType => {
  if (serverRunFlag === '--serverless=es') {
    return 'elasticsearch';
  }
  if (serverRunFlag === '--serverless=security') {
    return 'security';
  }
  if (serverRunFlag === '--serverless=security-essentials') {
    return 'security essentials';
  }
  if (serverRunFlag === '--serverless=security-ease') {
    return 'security ease';
  }
  if (serverRunFlag === '--serverless=oblt') {
    return 'observability';
  }
  if (serverRunFlag === '--serverless=oblt-logs-essentials') {
    return 'observability logs-essentials';
  }

  throw new Error(`Unknown serverRunFlag '${serverRunFlag}' for MKI deployment type`);
};

/**
 * Builds the full scout command string from a server run flag
 * Format: "node scripts/scout run-tests <serverRunFlag> --testTarget=cloud"
 */
const buildScoutCommand = (serverRunFlag: string): string => {
  return `node scripts/scout run-tests ${serverRunFlag} --testTarget=cloud`;
};

/**
 * Flattens ModuleDiscoveryInfo[] into an array grouped by mode, group, and server run flag
 * for qaf-tests run (Cloud test execution)
 */
export const flattenModulesByServerRunFlag = (
  modules: ModuleDiscoveryInfo[]
): FlattenedConfigGroup[] => {
  // Using a map with composite key: `${mode}:${group}:${serverRunFlag}`
  const groupsMap = new Map<string, FlattenedConfigGroup>();

  for (const module of modules) {
    for (const config of module.configs) {
      for (const serverRunFlag of config.serverRunFlags) {
        const mode: 'serverless' | 'stateful' = serverRunFlag.startsWith('--serverless')
          ? 'serverless'
          : 'stateful';

        const key = `${mode}:${module.group}:${serverRunFlag}`;

        // Get or create group
        let group = groupsMap.get(key);
        if (!group) {
          // Determine deployment type based on mode (ECH/stateful vs MKI/serverless)
          const deploymentType =
            mode === 'stateful'
              ? getDeploymentTypeForEch(module.group)
              : getDeploymentTypeForMki(serverRunFlag);

          group = {
            mode,
            deploymentType,
            group: module.group,
            scoutCommand: buildScoutCommand(serverRunFlag),
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
    // Sort by mode first (stateful before serverless), then by group, then by scout command (alphabetical)
    if (a.mode !== b.mode) {
      return a.mode === 'stateful' ? -1 : 1;
    }
    if (a.group !== b.group) {
      return a.group.localeCompare(b.group);
    }
    return a.scoutCommand.localeCompare(b.scoutCommand);
  });
};
