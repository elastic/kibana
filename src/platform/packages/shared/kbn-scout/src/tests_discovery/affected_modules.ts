/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { findPackageForPath } from '@kbn/repo-packages';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ModuleDiscoveryInfo } from './types';

/**
 * Resolve the @kbn/ module ID for a Scout config path using the kibana.jsonc-based package map.
 */
const getModuleIdForConfigPath = (configPath: string): string | undefined => {
  const absolutePath = path.isAbsolute(configPath) ? configPath : path.join(REPO_ROOT, configPath);
  const pkg = findPackageForPath(REPO_ROOT, absolutePath);
  return pkg?.id;
};

/**
<<<<<<< HEAD
 * Mark each module with `isAffected` against an in-memory set of @kbn/ IDs.
 * All modules are returned; downstream callers can drop non-affected ones to
 * implement selective testing.
=======
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
    const message = error instanceof Error ? error.message : String(error);
    log.warning(`Failed to read affected modules file '${filePath}': ${message}`);
    return null;
  }
};

/**
 * Mark modules with isAffected based on the affected modules set (see --affected-modules).
 * All modules are returned; use --selective-testing in discover-playwright-configs to drop non-affected.
>>>>>>> 9.4
 *
 * Behavior:
 * - Module maps to an affected @kbn/ ID -> isAffected: true
 * - Module does not map to any @kbn/ ID -> isAffected: false (warn)
 * - Module maps to a @kbn/ ID NOT in affected set -> isAffected: false
 */
export const markModulesAffectedStatusFromSet = (
  modules: ModuleDiscoveryInfo[],
  affectedModules: ReadonlySet<string>,
  log: ToolingLog
): ModuleDiscoveryInfo[] => {
  let affectedCount = 0;
  let unmappedCount = 0;

  const marked = modules.map((module) => {
    const configPath = module.configs[0]?.path ?? '';
    const moduleId = configPath ? getModuleIdForConfigPath(configPath) : undefined;

    if (!moduleId) {
      log.warning(
        `Selective testing: module '${module.name}' could not resolve @kbn/ ID (check kibana.jsonc or run 'yarn kbn bootstrap')`
      );
      unmappedCount += 1;
      return { ...module, isAffected: false };
    }

    const isAffected = affectedModules.has(moduleId);
    if (isAffected) affectedCount += 1;
    return { ...module, isAffected };
  });

  log.info(
    `Affected modules: ${affectedCount} affected, ${
      marked.length - affectedCount
    } unaffected, ${unmappedCount} unmapped`
  );

  return marked;
};

/**
 * Drop configs whose path is not in the `affectedConfigs` allowlist; drop modules
 * left without configs. Surviving configs are by definition affected, so the
 * module's isAffected flag is set to `true`.
 */
export const filterModulesByAffectedConfigs = (
  modules: ModuleDiscoveryInfo[],
  affectedConfigs: ReadonlySet<string>
): ModuleDiscoveryInfo[] =>
  modules
    .map((module) => ({
      ...module,
      isAffected: true,
      configs: module.configs.filter((config) => affectedConfigs.has(config.path)),
    }))
    .filter((module) => module.configs.length > 0);
