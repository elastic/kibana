/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as JSON5 from 'json5';
import { getKibanaDir } from '../utils';
import { getPackageLookup, findPackageForPath } from './package_lookup';

const REPO_ROOT = getKibanaDir();

/**
 * Parse a JSON5/JSONC file (like tsconfig.json) that may contain comments and trailing commas
 */
function parseJsoncFile(filePath: string): any {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON5.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Get dependencies for a package from its moon.yml or tsconfig.json
 */
function getDependenciesForPackage(packageDir: string): string[] {
  // Try to read dependencies from moon.yml first
  const moonYmlPath = path.join(REPO_ROOT, packageDir, 'moon.yml');
  try {
    const moonYmlContent = fs.readFileSync(moonYmlPath, 'utf8');
    const moonConfig = yaml.load(moonYmlContent) as any;
    if (moonConfig?.dependsOn && Array.isArray(moonConfig.dependsOn)) {
      return moonConfig.dependsOn;
    }
  } catch (error) {
    // moon.yml doesn't exist or can't be read, try tsconfig
  }

  // Fallback to tsconfig.json kbn_references
  const tsconfigPath = path.join(REPO_ROOT, packageDir, 'tsconfig.json');
  const tsconfig = parseJsoncFile(tsconfigPath);
  if (tsconfig?.kbn_references && Array.isArray(tsconfig.kbn_references)) {
    return tsconfig.kbn_references;
  }

  return [];
}

/**
 * Build a dependency graph that maps each package to its downstream dependents
 */
function buildDownstreamDependencyGraph(): Map<string, Set<string>> {
  const downstreamMap = new Map<string, Set<string>>();
  const packageLookup = getPackageLookup();

  // Initialize empty sets for all packages
  for (const packageName of packageLookup.values()) {
    downstreamMap.set(packageName, new Set<string>());
  }

  // For each package, add it to the downstream set of all its dependencies
  for (const [packageDir, packageName] of packageLookup.entries()) {
    const dependencies = getDependenciesForPackage(packageDir);
    for (const depId of dependencies) {
      const downstreams = downstreamMap.get(depId);
      if (downstreams) {
        downstreams.add(packageName);
      }
    }
  }

  return downstreamMap;
}

/**
 * Get the downstream dependents of a set of packages (deep traversal)
 */
function getDownstreamDependents(packageIds: Set<string>): Set<string> {
  const downstreamMap = buildDownstreamDependencyGraph();
  const result = new Set<string>(packageIds);

  // Deep traversal: keep adding dependents until no new ones are found
  const queue = Array.from(packageIds);
  const visited = new Set<string>(packageIds);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = downstreamMap.get(current);

    if (dependents) {
      for (const dependent of Array.from(dependents)) {
        if (!visited.has(dependent)) {
          visited.add(dependent);
          queue.push(dependent);
          result.add(dependent);
        }
      }
    }
  }

  return result;
}

/**
 * Git-based strategy: Get affected packages by mapping changed files to packages
 */
export function getAffectedPackagesGit(mergeBase: string, includeDownstream: boolean): Set<string> {
  // Get changed files from git
  const output = execSync(`git diff --name-only ${mergeBase} HEAD`, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
  });

  const changedFiles = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  // Map files to packages
  const directlyAffectedPackages = new Set<string>();
  for (const file of changedFiles) {
    const pkgId = findPackageForPath(file);
    if (pkgId) {
      directlyAffectedPackages.add(pkgId);
    }
  }

  // Get downstream dependents if requested
  return includeDownstream
    ? getDownstreamDependents(directlyAffectedPackages)
    : directlyAffectedPackages;
}
