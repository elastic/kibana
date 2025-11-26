/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import path from 'path';
import fs from 'fs';
import type { CliSupportedServerModes } from '../../types';
import { getConfigFilePath } from './get_config_file';
import { readConfigFile } from '../loader';
import type { Config } from '../config';
import { saveScoutTestConfigOnDisk } from './save_scout_test_config';

/**
 * Validates that a custom config file exists and returns the correct path.
 * Tries both with and without .ts extension if needed.
 * @param customConfigPath The provided config path
 * @param customDir The custom config directory
 * @returns The validated absolute path to the config file
 * @throws Error if the file doesn't exist
 */
function validateCustomConfigPath(customConfigPath: string, customDir: string): string {
  let configPath = path.join(customDir, customConfigPath);
  if (fs.existsSync(configPath)) {
    return path.resolve(configPath);
  }

  // If it doesn't end with .ts, try adding it
  if (!customConfigPath.endsWith('.ts')) {
    const pathWithExtension = `${customConfigPath}.ts`;
    configPath = path.join(customDir, pathWithExtension);
    if (fs.existsSync(configPath)) {
      return path.resolve(configPath);
    }
  }

  const customDirPath = path.resolve(customDir);
  const suggestedPath = customConfigPath.endsWith('.ts')
    ? customConfigPath
    : `${customConfigPath}.ts`;
  const fullSuggestedPath = path.join(customDirPath, suggestedPath);

  // List available files in the 'custom' directory
  let availableFiles: string[] = [];
  try {
    availableFiles = fs.readdirSync(customDirPath).filter((file) => file.endsWith('.ts'));
  } catch {
    // If readdir fails, directory might not exist, but we'll still show the error
  }

  let errorMessage = `Custom config file not found: ${fullSuggestedPath}`;
  if (availableFiles.length > 0) {
    errorMessage += `\n\nAvailable config files in ${customDirPath}:\n`;
    availableFiles.forEach((file) => {
      errorMessage += `  - ${file}\n`;
    });
    errorMessage += `\nDid you mean one of these files?`;
  } else {
    errorMessage += `\n\nThe custom config directory is empty.`;
  }

  throw new Error(errorMessage);
}

/**
 * Loads server configuration based on the mode, creates "kbn-test" compatible Config
 * instance, that can be used to start local servers and saves its "Scout"-format copy
 * to the disk.
 * @param mode server local run mode
 * @param log Logger instance to report errors or debug information.
 * @param customConfigPath Optional path to a custom config file (relative to config/custom directory)
 * @returns "kbn-test" compatible Config instance
 */
export async function loadServersConfig(
  mode: CliSupportedServerModes,
  log: ToolingLog,
  customConfigPath?: string
): Promise<Config> {
  // If custom config is provided, validate it exists first
  let configPath: string;
  if (customConfigPath) {
    const customDir = path.join(__dirname, '..', 'custom');
    configPath = validateCustomConfigPath(customConfigPath, customDir);
  } else {
    configPath = getConfigFilePath(mode);
  }

  // load config that is compatible with kbn-test input format
  const clusterConfig = await readConfigFile(configPath);
  // construct config for Playwright Test
  const scoutServerConfig = clusterConfig.getScoutTestConfig();
  // save test config to the file
  saveScoutTestConfigOnDisk(scoutServerConfig, log);
  return clusterConfig;
}
