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
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ModuleDiscoveryInfo } from './types';

/**
 * Build a map of directory path -> @kbn/ module ID from the root package.json.
 * Used to resolve Scout module roots to their @kbn/ identifiers.
 */
export const buildModuleIdLookup = (): Map<string, string> => {
  const packageJsonPath = path.join(REPO_ROOT, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const allDependencies: Record<string, string> = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const lookup = new Map<string, string>();
  for (const [moduleId, moduleLink] of Object.entries(allDependencies)) {
    if (moduleId.startsWith('@kbn/')) {
      const moduleDir = moduleLink.replace(/^link:/, '');
      lookup.set(moduleDir, moduleId);
    }
  }

  return lookup;
};

/**
 * Derive the module root directory from a Scout config path.
 * Config paths follow the pattern: <module_root>/test/scout[_*]/<category>/[*.]playwright.config.ts
 */
const getModuleRootFromConfigPath = (configPath: string): string | undefined => {
  const testScoutIndex = configPath.indexOf('/test/scout');
  return testScoutIndex !== -1 ? configPath.substring(0, testScoutIndex) : undefined;
};

/**
 * Read the affected modules JSON file produced by the `list_affected` CLI.
 * Returns null on any error (missing file, invalid JSON) to allow graceful fallback.
 */
export const readAffectedModules = (filePath: string, log: ToolingLog): Set<string> | null => {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(REPO_ROOT, filePath);
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      log.warning(`Affected modules file does not contain a JSON array: ${filePath}`);
      return null;
    }

    return new Set<string>(parsed);
  } catch (error) {
    log.warning(`Failed to read affected modules file '${filePath}': ${error}`);
    return null;
  }
};

/**
 * Filter modules to only those whose @kbn/ ID is in the affected modules set.
 *
 * Behavior:
 * - Module maps to an affected @kbn/ ID -> keep
 * - Module does not map to any @kbn/ ID -> keep (safe default)
 * - Module maps to a @kbn/ ID NOT in affected set -> drop
 * - If the file cannot be read or is invalid -> return all modules (no filtering)
 */
export const filterModulesByAffectedModules = (
  modules: ModuleDiscoveryInfo[],
  affectedModulesPath: string,
  log: ToolingLog
): ModuleDiscoveryInfo[] => {
  const affectedModules = readAffectedModules(affectedModulesPath, log);

  if (affectedModules === null) {
    log.warning('Selective testing: skipping filtering (could not load affected modules)');
    return modules;
  }

  if (affectedModules.size === 0) {
    log.info('Selective testing: no affected modules found, all modules will be excluded');
    return [];
  }

  const moduleIdLookup = buildModuleIdLookup();
  const kept: ModuleDiscoveryInfo[] = [];
  const dropped: string[] = [];

  for (const module of modules) {
    const moduleRoot = getModuleRootFromConfigPath(module.configs[0]?.path ?? '');
    const moduleId = moduleRoot ? moduleIdLookup.get(moduleRoot) : undefined;

    if (!moduleId) {
      kept.push(module);
    } else if (affectedModules.has(moduleId)) {
      kept.push(module);
    } else {
      dropped.push(`${module.name} (${moduleId})`);
    }
  }

  log.info(
    `Selective testing: keeping ${kept.length} module(s), dropping ${dropped.length} unaffected module(s)`
  );

  if (dropped.length > 0 && dropped.length <= 20) {
    log.info(`Dropped modules: ${dropped.join(', ')}`);
  }

  return kept;
};
