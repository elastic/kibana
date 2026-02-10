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
import { fileURLToPath } from 'url';

/**
 * Get the current directory, working in both ESM and CJS contexts.
 * - ESM: uses import.meta.url + fileURLToPath
 * - CJS: uses __dirname (provided by Node.js or shimmed by Vite's CJS interop)
 * - Vite Module Runner: uses import.meta.url (shimmed by Vite)
 */
function getCurrentDir(): string {
  // Try ESM approach first (works in ESM and Vite Module Runner)
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      return dirname(fileURLToPath(import.meta.url));
    }
  } catch {
    // import.meta.url not available in CJS
  }

  // Fallback to CJS __dirname
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }

  // Last resort: use createRequire to get the directory
  throw new Error(
    'Unable to determine current directory: neither import.meta.url nor __dirname available'
  );
}

/**
 * Attempts to read and parse a package.json file as a Kibana package.json
 */
const readKibanaPkgJson = (path: string): any | undefined => {
  try {
    const json = JSON.parse(readFileSync(path, 'utf8'));
    if (json && typeof json === 'object' && 'name' in json && json.name === 'kibana') {
      return json;
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
  return undefined;
};

/**
 * Walks up the directory tree to find the Kibana root package.json
 */
const findKibanaPackageJson = (): { kibanaDir: string; kibanaPkgJson: any } => {
  // Search for the kibana directory, since this file is moved around it might
  // not be where we think but should always be a relatively close parent
  // of this directory
  const startDir = getCurrentDir();
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
const REPO_ROOT: string = kibanaDir;

/**
 * The parsed contents of the Kibana package.json
 */
const PKG_JSON = kibanaPkgJson;

/**
 * Alias for PKG_JSON
 */
const kibanaPackageJson = PKG_JSON;

/**
 * The upstream branch name from package.json
 */
const UPSTREAM_BRANCH: string = kibanaPkgJson.branch;

/**
 * Returns true if this is a distributable build of Kibana
 */
const isKibanaDistributable = (): boolean => !!PKG_JSON.build?.distributable;

/**
 * Resolves a path relative to the Kibana repository root
 */
const fromRoot = (...paths: string[]): string => resolve(REPO_ROOT, ...paths);

export { REPO_ROOT, PKG_JSON, kibanaPackageJson, UPSTREAM_BRANCH, isKibanaDistributable, fromRoot };
