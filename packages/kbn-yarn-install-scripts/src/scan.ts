/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import { REPO_ROOT } from '@kbn/repo-info';

import type { PackageWithInstallScript, PackageJson } from './types';
import { MANAGED_LIFECYCLES } from '.';

export function scanInstallScripts(): PackageWithInstallScript[] {
  const rootNodeModulesDir = Path.join(REPO_ROOT, 'node_modules');
  const packagesWithInstallScripts: PackageWithInstallScript[] = [];

  if (!Fs.existsSync(rootNodeModulesDir)) {
    throw new Error('No node_modules found. Run yarn kbn bootstrap first.');
  }

  const stack: string[] = [rootNodeModulesDir];

  while (stack.length > 0) {
    const currentDir = stack.pop()!;

    const entries = Fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const entryPath = Path.join(currentDir, entry.name);

      if (entry.name.startsWith('@')) {
        stack.push(entryPath);
        continue;
      }

      const packageJsonPath = Path.join(entryPath, 'package.json');
      if (Fs.existsSync(packageJsonPath)) {
        const packageJsonContent = Fs.readFileSync(packageJsonPath, 'utf8');
        const packageJson: PackageJson = JSON.parse(packageJsonContent);

        if (!packageJson.name || !packageJson.version) {
          throw new Error(
            `Invalid package.json at ${packageJsonPath}: missing required name or version field`
          );
        }

        for (const lifecycle of MANAGED_LIFECYCLES) {
          const script = packageJson.scripts?.[lifecycle];
          if (script) {
            packagesWithInstallScripts.push({
              name: packageJson.name,
              version: packageJson.version,
              path: Path.relative(rootNodeModulesDir, entryPath),
              lifecycle,
              script,
            });
          }
        }
      }

      const nestedNodeModulesPath = Path.join(entryPath, 'node_modules');
      if (Fs.existsSync(nestedNodeModulesPath)) {
        stack.push(nestedNodeModulesPath);
      }
    }
  }

  return packagesWithInstallScripts;
}
