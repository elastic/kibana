/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';

/**
 * Determines the package directory for a given file path
 * A package is defined as a directory containing a kibana.jsonc file
 *
 * @param filePath The path of the file to find the package for
 * @returns The package directory path or the original path if no package found
 */
function findPackageDirectory(filePath: string): string {
  let currentDir = path.dirname(filePath);
  const rootDir = path.parse(currentDir).root;

  // Traverse up the directory tree until we find a kibana.jsonc file or hit the root
  while (true) {
    // Check if current directory has kibana.jsonc
    if (fs.existsSync(path.join(currentDir, 'kibana.jsonc'))) {
      return currentDir;
    }

    // If we've reached the root and haven't found kibana.jsonc, break the loop
    if (currentDir === rootDir) {
      break;
    }

    // Move up to parent directory
    const parentDir = path.dirname(currentDir);

    // Break if we can't go up any further (safety check)
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  // If no package directory found, return the directory of the original path
  return path.dirname(filePath);
}

/**
 * Groups dependencies by package (directories containing kibana.jsonc files)
 *
 * @param dependencies Array of from/to dependency pairs
 * @returns Record mapping package paths to their dependencies
 */
export function groupByPackage(dependencies: Array<{ from: string; to: string }>) {
  const packageMap = new Map<string, Set<string>>();

  for (const dep of dependencies) {
    const { from, to } = dep;

    // Find the package directory for the source file
    const packageDir = findPackageDirectory(from);

    if (!packageMap.has(packageDir)) {
      packageMap.set(packageDir, new Set());
    }

    packageMap.get(packageDir)!.add(to.replace(/^node_modules\//, ''));
  }

  // Convert the map to a record
  const result: Record<string, string[]> = {};
  for (const [packageDir, deps] of packageMap.entries()) {
    result[packageDir] = Array.from(deps);
  }

  return result;
}
