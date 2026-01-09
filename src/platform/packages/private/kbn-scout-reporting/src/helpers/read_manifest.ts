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
 * @throws Error if `scout` or `scout_*` is not found in the path.
 */
export const getKibanaModulePath = (configPath: string): string => {
  const pathSegments = configPath.split(path.sep);
  const testDirIndex = pathSegments.findIndex(
    (segment) => segment === 'scout' || segment.startsWith('scout_')
  );

  if (testDirIndex === -1) {
    throw new Error(
      `Invalid path: "scout" or "scout_*" directory not found in ${configPath}.
  Ensure Playwright configuration file is in the plugin directory: '/plugins/<plugin-name>/test/{scout,scout_*}/ui/<config-file>'`
    );
  }

  const manifestSegments = pathSegments.slice(0, testDirIndex - 1).concat('kibana.jsonc');
  return path.resolve('/', ...manifestSegments); // Ensure absolute path
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
