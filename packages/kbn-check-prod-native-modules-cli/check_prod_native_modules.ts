/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as path from 'path';
import { promises as fs, existsSync } from 'fs';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { findProductionDependencies, readYarnLock } from '@kbn/yarn-lock-validator';
import { loadPackageJson } from './helpers';

// Checks if a given path contains a native module or not recursively
async function isNativeModule(modulePath: string, log: ToolingLog): Promise<boolean> {
  const stack: string[] = [modulePath];

  while (stack.length > 0) {
    const currentPath = stack.pop() as string;

    // Skip processing if the current directory is a node_modules folder
    if (path.basename(currentPath) === 'node_modules') {
      continue;
    }

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          stack.push(entryPath);
        } else if (entry.name === 'binding.gyp' || entry.name.endsWith('.node')) {
          return true;
        }
      }
    } catch (err) {
      log.error(`Error when reading ${currentPath}: ${err.message}`);
    }
  }
  return false;
}

// Searches through node_modules and for each module which is a prod dep (or a direct result of one) checks recursively for native modules
async function checkDependencies(
  rootNodeModulesDir: string,
  productionDependencies: Map<string, boolean>,
  prodNativeModulesFound: Array<{ name: string; version: string; path: string }>,
  log: ToolingLog
) {
  const stack: string[] = [rootNodeModulesDir];

  while (stack.length > 0) {
    const currentDir = stack.pop() as string;

    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const entryPath = path.join(currentDir, entry.name);
        if (entry.name.startsWith('@')) {
          // Handle scoped packages (e.g., @scope/package)
          stack.push(entryPath);
          continue;
        }

        const packageJsonPath = path.join(entryPath, 'package.json');
        if (existsSync(packageJsonPath)) {
          const packageJson = loadPackageJson(packageJsonPath);
          const dependencyKey = `${packageJson.name}@${packageJson.version}`;

          if (productionDependencies.has(dependencyKey)) {
            const isNative = await isNativeModule(entryPath, log);
            if (isNative) {
              prodNativeModulesFound.push({
                name: packageJson.name,
                version: packageJson.version,
                path: entryPath,
              });
            }
          }
        }

        // Adds nested node_modules to the stack to check for further dependencies
        const nestedNodeModulesPath = path.join(entryPath, 'node_modules');
        if (existsSync(nestedNodeModulesPath)) {
          stack.push(nestedNodeModulesPath);
        }
      }
    } catch (err) {
      throw new Error(`Error processing directory ${currentDir}: ${err.message}`);
    }
  }
}

// Checks if there are native modules in the production dependencies
async function checkProdNativeModules(log: ToolingLog) {
  log.info('Checking for native modules on production dependencies...');
  const rootNodeModulesDir = path.join(REPO_ROOT, 'node_modules');
  const prodNativeModulesFound: Array<{ name: string; version: string; path: string }> = [];

  try {
    // Gets all production dependencies based on package.json and then searches across transient dependencies using lock file
    const rawProductionDependencies = findProductionDependencies(log, await readYarnLock());

    // Converts rawProductionDependencies into a simple Map of production dependencies
    const productionDependencies: Map<string, boolean> = new Map();
    rawProductionDependencies.forEach((depInfo, depKey) => {
      productionDependencies.set(`${depInfo.name}@${depInfo.version}`, true);
    });

    // Fail if no root node_modules folder
    if (!existsSync(rootNodeModulesDir)) {
      throw new Error(
        'No root node_modules folder was found in the project. Impossible to continue'
      );
    }

    // Goes into the node_modules folder and for each node_module which is a production dependency (or a result of one) checks recursively if there are native modules
    await checkDependencies(
      rootNodeModulesDir,
      productionDependencies,
      prodNativeModulesFound,
      log
    );

    // In that case no prod native modules were found
    if (!prodNativeModulesFound.length) {
      log.success('No production native modules installed were found');
      return false;
    }

    // Logs every detected native module at once
    prodNativeModulesFound.forEach((dep) => {
      log.error(`Production native module detected: ${path.relative(REPO_ROOT, dep.path)}`);
    });

    throw new Error('Production native modules were detected and logged above');
  } catch (err) {
    log.error(err.message);
    return true;
  }
}

export { checkProdNativeModules, checkDependencies, isNativeModule };
