/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import { Jsonc } from '@kbn/repo-packages';

export interface PluginManifest {
  id: string;
  ui?: boolean;
  server?: boolean;
  requiredPlugins?: string[];
  optionalPlugins?: string[];
  requiredBundles?: string[];
  extraPublicDirs?: string[];
}

/**
 * Read and parse a plugin's kibana.json manifest
 */
export function readManifest(manifestPath: string): PluginManifest {
  let json: string;
  try {
    json = Fs.readFileSync(manifestPath, 'utf8');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`Manifest not found: ${manifestPath}`);
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = Jsonc.parse(json);
  } catch (error: any) {
    throw new Error(`Failed to parse manifest at ${manifestPath}: ${error.message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Invalid manifest at ${manifestPath}: expected object`);
  }

  const manifest = parsed as Record<string, unknown>;

  // Handle nested plugin config (for package.json style manifests)
  const pluginConfig = manifest.plugin && typeof manifest.plugin === 'object' 
    ? manifest.plugin as Record<string, unknown>
    : manifest;

  const id = pluginConfig.id;
  if (typeof id !== 'string') {
    throw new Error(`Invalid manifest at ${manifestPath}: missing or invalid 'id'`);
  }

  return {
    id,
    ui: pluginConfig.ui === true,
    server: pluginConfig.server === true,
    requiredPlugins: toStringArray(pluginConfig.requiredPlugins),
    optionalPlugins: toStringArray(pluginConfig.optionalPlugins),
    requiredBundles: toStringArray(pluginConfig.requiredBundles),
    extraPublicDirs: toStringArray(pluginConfig.extraPublicDirs),
  };
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  if (!value.every((item) => typeof item === 'string')) {
    return undefined;
  }
  return value;
}
