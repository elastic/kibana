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
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ModuleDiscoveryInfo } from './types';

/**
 * Read the affected configs JSON file (an array of repo-relative Playwright config paths)
 * produced by the Scout selective-testing resolver when the PR diff is "Scout tests only".
 * Returns null on any error so the CLI can fail fast with a clearer message.
 */
export const readAffectedConfigs = (filePath: string, log: ToolingLog): Set<string> | null => {
  try {
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(REPO_ROOT, filePath);
    const content = fs.readFileSync(absolutePath, 'utf-8');
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      log.warning(`Affected configs file does not contain a JSON array: ${filePath}`);
      return null;
    }

    if (parsed.some((entry) => typeof entry !== 'string')) {
      log.warning(`Affected configs file contains non-string entries: ${filePath}`);
      return null;
    }

    return new Set<string>(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warning(`Failed to read affected configs file '${filePath}': ${message}`);
    return null;
  }
};

/**
 * Narrow modules to only the configs whose path is in the affected-configs allowlist.
 * Used by `discover-playwright-configs --selective-testing --affected-configs <file>`,
 * where the PR's diff is exclusively under Scout test scopes (no module dep walk needed).
 *
 * Behavior:
 * - Each module's `configs` array is filtered to keep only allow-listed paths.
 * - Modules with zero remaining configs are dropped.
 * - Surviving modules are marked `isAffected: true` so CI step labels keep the
 *   "affected " prefix.
 * - If the file cannot be read or is invalid -> throw (fail fast).
 */
export const filterModulesByAffectedConfigs = (
  modules: ModuleDiscoveryInfo[],
  affectedConfigsPath: string,
  log: ToolingLog
): ModuleDiscoveryInfo[] => {
  const affectedConfigs = readAffectedConfigs(affectedConfigsPath, log);

  if (affectedConfigs === null) {
    throw createFailError(
      'Selective testing: could not load affected configs file. Check that the resolver produced a valid JSON array of config paths.'
    );
  }

  if (affectedConfigs.size === 0) {
    log.warning('Affected configs file is empty — no Scout configs will be scheduled.');
    return [];
  }

  let keptConfigCount = 0;
  let droppedConfigCount = 0;

  const narrowed = modules.flatMap((module) => {
    const keptConfigs = module.configs.filter((c) => affectedConfigs.has(c.path));
    droppedConfigCount += module.configs.length - keptConfigs.length;
    keptConfigCount += keptConfigs.length;

    if (keptConfigs.length === 0) {
      return [];
    }

    return [{ ...module, isAffected: true, configs: keptConfigs }];
  });

  log.info(
    `Affected configs: ${keptConfigCount} kept, ${droppedConfigCount} dropped, ${narrowed.length} module(s) survived`
  );

  return narrowed;
};
