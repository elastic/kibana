/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as path from 'path';
import { promises as fs } from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';

// Collect the direct devDependencies directly from the package.json file
const getDevDependencies = async (): Promise<Set<string>> => {
  const packageJsonPath = path.join(REPO_ROOT, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
  return new Set(Object.keys(packageJson.devDependencies || {}));
};

// Reads and parses the yarn.lock file and from there builds a dependency graph
const buildDependencyGraph = async (lockFilePath: string): Promise<{ [key: string]: string[] }> => {
  const lockFile = await fs.readFile(lockFilePath, 'utf-8');
  const dependencies: { [key: string]: string[] } = {};
  const regex = /^"?(@?[^@\s]+@[^:\s]+)[^:\n]*:\n((?:\s+[^\n]+)+)/gm;
  let match;
  while ((match = regex.exec(lockFile)) !== null) {
    const [, packageName, packageDependencies] = match;
    dependencies[packageName] = packageDependencies.split('\n').reduce((acc: string[], line) => {
      const depMatch = line.trim().match(/^dependencies\s+(@?[^@\s]+@[^:\s]+)$/);
      if (depMatch) {
        acc.push(depMatch[1]);
      }
      return acc;
    }, []);
  }
  return dependencies;
};

// It traverses the provided dependency graph and classify dependencies as being installed directly or indirectly as a result
// of a development dependency
const traverseDependencies = (
  graph: { [key: string]: string[] },
  devDependencies: Set<string>
): Set<string> => {
  const visited: Set<string> = new Set();
  const isDevDependency: Set<string> = new Set();

  const visit = (pkg: string) => {
    if (visited.has(pkg)) return;
    visited.add(pkg);

    const baseName = pkg.replace(/@[^@]+$/, '');
    if (devDependencies.has(baseName)) {
      isDevDependency.add(pkg);
    }

    const deps = graph[pkg] || [];
    for (const dep of deps) {
      visit(dep);
      if (isDevDependency.has(dep)) {
        isDevDependency.add(pkg);
      }
    }
  };

  Object.keys(graph).forEach(visit);

  return isDevDependency;
};

// Checks if a given path contains a native module or not
const isNativeModule = async (modulePath: string) => {
  try {
    const files = await fs.readdir(modulePath);
    return files.some((file) => file === 'binding.gyp' || file.endsWith('.node'));
  } catch (err) {
    return false;
  }
};

// Checks if there are native modules in the production dependencies
const checkProdNativeModules = async (log: ToolingLog) => {
  log.info('Checking for native modules on production dependencies...');
  const nodeModulesDir = path.join(REPO_ROOT, 'node_modules');
  const yarnLockPath = path.join(REPO_ROOT, 'yarn.lock');
  const prodNativeModulesFound = [];

  try {
    // It gets development dependencies and builds the dep graph
    const devDependencies = await getDevDependencies();
    const dependencyGraph = await buildDependencyGraph(yarnLockPath);

    // It traverses the whole dep graph and classify development dependencies
    const isDevDependency = traverseDependencies(dependencyGraph, devDependencies);

    // Loops over all dependencies and checks for production native modules
    for (const dep of Object.keys(dependencyGraph)) {
      if (!isDevDependency.has(dep)) {
        const depPath = path.join(nodeModulesDir, dep.replace(/@[^@]+$/, ''));
        if (await isNativeModule(depPath)) {
          prodNativeModulesFound.push(dep);
        }
      }
    }

    // In that case no prod native modules were found
    if (!prodNativeModulesFound.length) {
      log.success('No production native modules installed were found');
      return false;
    }

    // Logs every detected native module at once
    prodNativeModulesFound.forEach((dep) => {
      log.error(`Production native module detected: ${dep}`);
    });
    throw new Error('Production native modules were detected');
  } catch (err) {
    return true;
  }
};

export { checkProdNativeModules };
