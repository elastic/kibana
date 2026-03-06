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
import jsYaml from 'js-yaml';

import { getKibanaDir, readFile, readJsonWithComments } from '../util';
import { getPackageLookup, findPackageForPath } from './package_lookup';

function getRepoRoot(): string {
  return getKibanaDir();
}

function parseYaml(content: string): unknown {
  return jsYaml.load(content);
}

/**
 * Get dependencies for a package from its moon.yml or tsconfig.json
 */
function getDependenciesForPackage(packageDir: string): string[] {
  const moonYmlPath = path.join(getRepoRoot(), packageDir, 'moon.yml');
  try {
    const moonYmlContent = readFile(moonYmlPath);
    const moonConfig = parseYaml(moonYmlContent) as { dependsOn?: string[] };
    if (moonConfig?.dependsOn && Array.isArray(moonConfig.dependsOn)) {
      return moonConfig.dependsOn;
    }
  } catch {
    // moon.yml doesn't exist or can't be read, try tsconfig
  }

  const tsconfigPath = path.join(getRepoRoot(), packageDir, 'tsconfig.json');
  try {
    const tsconfig = readJsonWithComments(tsconfigPath) as { kbn_references?: string[] };
    if (tsconfig?.kbn_references && Array.isArray(tsconfig.kbn_references)) {
      return tsconfig.kbn_references;
    }
  } catch {
    // tsconfig doesn't exist or can't be read
  }

  return [];
}

/**
 * Build a dependency graph that maps each package to its downstream dependents
 */
function buildDownstreamDependencyGraph(): Map<string, Set<string>> {
  const downstreamMap = new Map<string, Set<string>>();
  const packageLookup = getPackageLookup();

  for (const packageName of packageLookup.values()) {
    downstreamMap.set(packageName, new Set<string>());
  }

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
 * Git-based strategy: get affected packages by mapping changed files to packages.
 */
export function getAffectedPackagesGit(mergeBase: string, includeDownstream: boolean): Set<string> {
  const output = execSync(`git diff --name-only ${mergeBase} HEAD`, {
    cwd: getRepoRoot(),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  const changedFiles = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const directlyAffectedPackages = new Set<string>();
  for (const file of changedFiles) {
    const pkgId = findPackageForPath(file);
    if (pkgId) {
      directlyAffectedPackages.add(pkgId);
    }
  }

  return includeDownstream
    ? getDownstreamDependents(directlyAffectedPackages)
    : directlyAffectedPackages;
}
