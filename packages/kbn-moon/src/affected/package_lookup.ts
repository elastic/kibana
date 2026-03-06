/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as path from 'path';
import { getKibanaDir, readFile } from '../util';

let cachedPackageLookup: Map<string, string> | null = null;

/**
 * Get all @kbn packages from package.json
 * Returns a map of package directory -> package name
 */
export function getPackageLookup(): Map<string, string> {
  if (cachedPackageLookup != null) {
    return cachedPackageLookup;
  }

  const packageJsonPath = path.join(getKibanaDir(), 'package.json');
  const packageJson = JSON.parse(readFile(packageJsonPath));
  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const packageLookup = new Map<string, string>();
  for (const [packageName, packageLink] of Object.entries(allDependencies) as [string, string][]) {
    if (packageName.startsWith('@kbn/')) {
      const packageDir = packageLink.replace(/^link:/, '');
      packageLookup.set(packageDir, packageName);
    }
  }

  cachedPackageLookup = packageLookup;

  return packageLookup;
}

/**
 * Find the package that contains a given file path.
 * Uses the longest prefix of the path that is a key in the package lookup.
 */
export function findPackageForPath(filePath: string): string | undefined {
  const packageLookup = getPackageLookup();

  let longestPrefix = '';
  for (const packageDir of packageLookup.keys()) {
    if (filePath.startsWith(packageDir)) {
      if (packageDir.length > longestPrefix.length) {
        longestPrefix = packageDir;
      }
    }
  }

  return packageLookup.get(longestPrefix);
}
