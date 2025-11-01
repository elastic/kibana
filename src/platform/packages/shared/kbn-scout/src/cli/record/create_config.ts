/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { promises as fs } from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';

/**
 * Determines the correct Scout package based on plugin path
 */
export function detectScoutPackage(pluginPath: string): string {
  if (pluginPath.includes('x-pack/solutions/security')) {
    return '@kbn/scout-security';
  }
  if (pluginPath.includes('x-pack/solutions/observability')) {
    return '@kbn/scout-oblt';
  }
  return '@kbn/scout';
}

/**
 * Generates Playwright config content for Scout
 */
function generateConfigContent(scoutPackage: string, isParallel: boolean): string {
  const workers = isParallel ? 2 : 1;

  return `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '${scoutPackage}';

export default createPlaywrightConfig({
  testDir: './tests',
  workers: ${workers},
});
`;
}

/**
 * Generates parallel Playwright config content for Scout
 */
function generateParallelConfigContent(scoutPackage: string): string {
  return `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPlaywrightConfig } from '${scoutPackage}';

export default createPlaywrightConfig({
  testDir: './parallel_tests',
  workers: 2,
});
`;
}

/**
 * Creates or updates Playwright config file for the plugin
 */
export async function ensurePlaywrightConfig(
  pluginPath: string,
  isParallel: boolean
): Promise<void> {
  const scoutPackage = detectScoutPackage(pluginPath);
  const configDir = path.join(REPO_ROOT, pluginPath, 'test/scout/ui');
  const testsDir = path.join(configDir, isParallel ? 'parallel_tests' : 'tests');

  // Create directories if they don't exist
  await fs.mkdir(testsDir, { recursive: true });

  // Create main config if it doesn't exist
  const mainConfigPath = path.join(configDir, 'playwright.config.ts');
  try {
    await fs.access(mainConfigPath);
    // Config exists, don't overwrite
  } catch {
    // Config doesn't exist, create it
    const content = generateConfigContent(scoutPackage, false);
    await fs.writeFile(mainConfigPath, content, 'utf-8');
  }

  // Create parallel config if needed and doesn't exist
  if (isParallel) {
    const parallelConfigPath = path.join(configDir, 'parallel.playwright.config.ts');
    try {
      await fs.access(parallelConfigPath);
      // Config exists, don't overwrite
    } catch {
      // Config doesn't exist, create it
      const content = generateParallelConfigContent(scoutPackage);
      await fs.writeFile(parallelConfigPath, content, 'utf-8');
    }
  }
}
