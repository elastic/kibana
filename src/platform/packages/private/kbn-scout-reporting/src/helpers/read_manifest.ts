/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import fs from 'fs';
import { Jsonc } from '@kbn/repo-packages';
import { REPO_ROOT } from '@kbn/repo-info';

export interface KibanaJsoncMetadata {
  id: string;
  type: string;
  group: string;
  owner: string[];
  visibility: string;
  plugin?: { id: string };
}

export interface KibanaModuleMetadata {
  id: string;
  type: string;
  group: string;
  owner: string[];
  visibility: string;
}

/**
 * Resolves the path to the `kibana.jsonc` manifest based on the Playwright configuration file path.
 * @param configPath - Absolute path to the Playwright configuration file.
 * @returns Absolute path to the `kibana.jsonc` file.
 * @throws Error if no `kibana.jsonc` can be found in the directory ancestry.
 */
export const getKibanaModulePath = (configPath: string): string => {
  const repoRoot = path.resolve(REPO_ROOT);
  let dir = path.dirname(path.resolve(configPath));

  // Walk up the directory tree looking for the nearest kibana.jsonc.
  // This supports both plugin-based Scout configs (`.../test/scout/...`) and package-based configs.
  while (dir.startsWith(repoRoot)) {
    const manifestPath = path.join(dir, 'kibana.jsonc');
    if (fs.existsSync(manifestPath)) {
      return manifestPath;
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    `Manifest file not found for Playwright config at ${configPath}. Expected to find a kibana.jsonc in a parent directory.`
  );
};

/**
 * Reads and parses the `kibana.jsonc` manifest file.
 * @param filePath - Absolute path to the `kibana.jsonc` file.
 * @returns Parsed `KibanaModuleMetadata` object.
 * @throws Error if the file does not exist, cannot be read, or is invalid.
 */
export const readKibanaModuleManifest = (filePath: string): KibanaModuleMetadata => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Manifest file not found: ${filePath}`);
  }

  let fileContent: string;
  try {
    fileContent = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read manifest file at ${filePath}: ${error.message}`);
  }

  let manifest: Partial<KibanaJsoncMetadata>;
  try {
    manifest = Jsonc.parse(fileContent) as Partial<KibanaJsoncMetadata>;
  } catch (error) {
    throw new Error(`Invalid JSON format in manifest file at ${filePath}: ${error.message}`);
  }

  const { group, visibility, owner } = manifest;
  const id = manifest.plugin ? manifest.plugin.id : manifest.id;
  const type = manifest.plugin ? 'plugin' : 'package';
  if (!id || !group || !visibility) {
    throw new Error(
      `Invalid manifest structure at ${filePath}. Expected required fields: id, group, visibility`
    );
  }

  return { id, type, group, visibility, owner: owner || [] };
};

/**
 * Resolves the module manifest file path and reads its content.
 * @param configPath - Absolute path to the Playwright configuration file in the plugin directory.
 * @returns Parsed `KibanaModuleMetadata` object.
 */
export const getKibanaModuleData = (configPath: string): KibanaModuleMetadata => {
  const manifestPath = getKibanaModulePath(configPath);
  return readKibanaModuleManifest(manifestPath);
};
