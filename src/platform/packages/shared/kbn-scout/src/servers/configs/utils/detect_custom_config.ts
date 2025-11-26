/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import type { CliSupportedServerModes } from '../../../types';

/**
 * Detects if the playwright config path indicates a custom config directory.
 * Custom configs are detected when the path contains 'scout_<name>' instead of 'scout/'.
 * @param playwrightConfigPath Path to the playwright config file
 * @returns The custom config directory name if detected, null otherwise
 */
export function detectCustomConfigDir(playwrightConfigPath: string): string | null {
  const normalizedPath = playwrightConfigPath.replace(/\\/g, '/');

  // Look for pattern: /test/scout_<name>/
  const match = normalizedPath.match(/\/test\/scout_([^/]+)\//);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Determines the config root directory based on playwright config path, optional config dir, and mode.
 * Returns the root directory where the config file should be located.
 * @param playwrightConfigPath path to the playwright config file
 * @param mode The server mode (e.g., 'serverless=es', 'stateful')
 * @param configDir Optional custom config directory name (e.g., 'uiam_local')
 * @returns The root directory path for the config (e.g., 'default/serverless', 'custom/uiam_local/serverless')
 */
export function getConfigRootDir(
  playwrightConfigPath: string,
  mode: CliSupportedServerModes,
  configDir?: string
): string {
  const baseDir = path.join(__dirname, '..'); // configs base directory
  const modeDir = mode === 'stateful' ? 'stateful' : 'serverless';

  // If configDir is explicitly provided, use it
  if (configDir) {
    return path.join(baseDir, 'custom', configDir, modeDir);
  }

  // Otherwise, check if playwright path indicates a custom config
  const customConfigDir = detectCustomConfigDir(playwrightConfigPath);
  if (customConfigDir) {
    return path.join(baseDir, 'custom', customConfigDir, modeDir);
  }

  // Default config
  return path.join(baseDir, 'default', modeDir);
}
