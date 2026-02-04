/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve, parse, dirname } from 'path';
import { readFileSync, realpathSync } from 'fs';

import type { KibanaPackageJson } from './types.js';

// Use __dirname which is available in CommonJS (esbuild will preserve it)

/**
 * Attempts to read and parse a package.json file as a Kibana package.json
 */
const readKibanaPkgJson = (path: string): KibanaPackageJson | undefined => {
  try {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    if (json && typeof json === 'object' && 'name' in json && json.name === 'kibana') {
      return json as KibanaPackageJson;
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
  return undefined;
};

/**
 * Walks up the directory tree to find the Kibana root package.json
 */
const findKibanaPackageJson = (): { kibanaDir: string; kibanaPkgJson: KibanaPackageJson } => {
  // Search for the kibana directory, since this file is moved around it might
  // not be where we think but should always be a relatively close parent
  // of this directory
  const startDir = __dirname;
  const { root: rootDir } = parse(startDir);
  let cursor = startDir;

  while (true) {
    const packageJsonPath = resolve(cursor, 'package.json');
    const kibanaPkgJson = readKibanaPkgJson(packageJsonPath);

    if (kibanaPkgJson) {
      return {
        // We use realpathSync to resolve the package.json path to the actual file
        // in the repo rather than the sym-linked version if it is symlinked
        kibanaDir: dirname(realpathSync(packageJsonPath)),
        kibanaPkgJson,
      };
    }

    const parent = dirname(cursor);
    if (parent === rootDir) {
      throw new Error(`unable to find kibana directory from ${startDir}`);
    }
    cursor = parent;
  }
};

const { kibanaDir, kibanaPkgJson } = findKibanaPackageJson();

/**
 * The absolute path to the Kibana repository root
 */
export const REPO_ROOT = kibanaDir;

/**
 * The parsed contents of the Kibana package.json
 */
export const PKG_JSON = kibanaPkgJson;

/**
 * Alias for PKG_JSON
 */
export const kibanaPackageJson = PKG_JSON;

/**
 * The upstream branch name from package.json
 */
export const UPSTREAM_BRANCH = kibanaPkgJson.branch;

/**
 * Returns true if this is a distributable build of Kibana
 */
export const isKibanaDistributable = (): boolean => !!PKG_JSON.build?.distributable;

/**
 * Resolves a path relative to the Kibana repository root
 */
export const fromRoot = (...paths: string[]): string => resolve(REPO_ROOT, ...paths);

// Re-export types
export type { KibanaPackageJson } from './types.js';
