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

// Checks if a given path contains a native module or not recursively
const isNativeModule = async (modulePath: string, log: ToolingLog): Promise<boolean> => {
  const stack = [modulePath];

  while (stack.length > 0) {
    const currentPath: string = stack.pop() as string;

    if (path.basename(currentPath) === 'node_modules') {
      continue;
    }

    try {
      const files = await fs.readdir(currentPath);
      for (const file of files) {
        const filePath = path.join(currentPath, file);
        const stat = await fs.lstat(filePath);
        if (stat.isDirectory()) {
          stack.push(filePath);
        } else if (file === 'binding.gyp' || file.endsWith('.node')) {
          return true;
        }
      }
    } catch (err) {
      log.error(`Error when reading ${currentPath}: ${err.message}`);
    }
  }
  return false;
};

async function checkDependencies(
  rootNodeModulesDir: string,
  productionDependencies: Map<string, boolean>,
  prodNativeModulesFound: Array<{ name: string; version: string; path: string }>,
  log: ToolingLog
) {
  const stack = [rootNodeModulesDir];

  while (stack.length > 0) {
    const currentDir: string = stack.pop() as string;
    const files = await fs.readdir(currentDir, { withFileTypes: true });

    for (const file of files) {
      if (file.isDirectory()) {
        const filePath = path.join(currentDir, file.name);

        if (file.name.startsWith('@')) {
          // Handle scoped packages
          stack.push(filePath);
        } else {
          const packageJsonPath = path.join(filePath, 'package.json');

          if (existsSync(packageJsonPath)) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const packageJson = require(packageJsonPath);
            const key = `${packageJson.name}@${packageJson.version}`;

            if (productionDependencies.has(key)) {
              if (await isNativeModule(filePath, log)) {
                prodNativeModulesFound.push({
                  name: packageJson.name,
                  version: packageJson.version,
                  path: filePath,
                });
              }
            }
          }

          // Add nested node_modules to the stack
          const nestedNodeModulesPath = path.join(filePath, 'node_modules');
          if (existsSync(nestedNodeModulesPath)) {
            stack.push(nestedNodeModulesPath);
          }
        }
      }
    }
  }
}

// Checks if there are native modules in the production dependencies
const checkProdNativeModules = async (log: ToolingLog) => {
  log.info('Checking for native modules on production dependencies...');
  const rootNodeModulesDir = path.join(REPO_ROOT, 'node_modules');
  const prodNativeModulesFound: Array<{ name: string; version: string; path: string }> = [];

  try {
    // Gets all production dependencies based on package.json and then searches across transient dependencies using lock file
    const rawProductionDependencies = findProductionDependencies(log, await readYarnLock());
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
      log.error(`Production native module detected: ${dep.path}`);
    });

    throw new Error('Production native modules were detected and logged above');
  } catch (err) {
    log.error(err.message);
    return true;
  }
};

export { checkProdNativeModules };
