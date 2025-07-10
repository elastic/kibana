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

export interface PluginManifest {
  id: string;
  group: string;
  owner: string[];
  visibility: string;
  plugin: { id: string };
}

/**
 * Resolves the path to the `kibana.jsonc` manifest based on the Playwright configuration file path.
 * @param configPath - Absolute path to the Playwright configuration file.
 * @returns Absolute path to the `kibana.jsonc` file.
 * @throws Error if `scout` is not found in the path.
 */
export const getManifestPath = (configPath: string): string => {
  const pathSegments = configPath.split(path.sep);
  const testDirIndex = pathSegments.indexOf('scout');

  if (testDirIndex === -1) {
    throw new Error(
      `Invalid path: "scout" directory not found in ${configPath}.
  Ensure playwright configuration file is in the plugin directory: '/plugins/<plugin-name>/test/scout/ui/<config-file>'`
    );
  }

  const manifestSegments = pathSegments.slice(0, testDirIndex - 1).concat('kibana.jsonc');
  return path.resolve('/', ...manifestSegments); // Ensure absolute path
};

/**
 * Reads and parses the `kibana.jsonc` manifest file.
 * @param filePath - Absolute path to the `kibana.jsonc` file.
 * @returns Parsed `PluginManifest` object.
 * @throws Error if the file does not exist, cannot be read, or is invalid.
 */
export const readPluginManifest = (filePath: string): PluginManifest => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Manifest file not found: ${filePath}`);
  }

  let fileContent: string;
  try {
    fileContent = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Failed to read manifest file at ${filePath}: ${error.message}`);
  }

  let manifest: Partial<PluginManifest>;
  try {
    manifest = Jsonc.parse(fileContent) as Partial<PluginManifest>;
  } catch (error) {
    throw new Error(`Invalid JSON format in manifest file at ${filePath}: ${error.message}`);
  }

  const { id, group, visibility, owner, plugin } = manifest;
  if (!id || !group || !visibility || !plugin?.id) {
    throw new Error(
      `Invalid manifest structure at ${filePath}. Expected required fields: id, group, visibility, plugin.id`
    );
  }

  return { id, group, visibility, owner: owner || [], plugin };
};

/**
 * Resolves the plugin manifest file path and reads its content.
 * @param configPath - Absolute path to the Playwright configuration file in the plugin directory.
 * @returns Parsed `PluginManifest` object.
 */
export const getPluginManifestData = (configPath: string): PluginManifest => {
  const manifestPath = getManifestPath(configPath);
  return readPluginManifest(manifestPath);
};
