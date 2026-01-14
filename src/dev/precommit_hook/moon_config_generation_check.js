/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import fs from 'fs/promises';

import { REPO_ROOT } from '../kbn_pm/src/lib/paths.mjs';

import { PrecommitCheck } from './precommit_check';

export class MoonConfigGenerationCheck extends PrecommitCheck {
  constructor() {
    super('Moon Config');
  }

  shouldExecute({ files, deletedFiles }) {
    return files
      .concat(deletedFiles)
      .some(
        (f) => f.relativePath.endsWith('moon.yml') || f.relativePath.endsWith('moon.extend.yml')
      );
  }

  async execute(log, files, options) {
    const rootPackageJsonPath = path.join(REPO_ROOT, 'package.json');
    const rootPackageJson = await fs.readFile(rootPackageJsonPath);
    const rootPackage = JSON.parse(rootPackageJson);
    const dependencyLookup = Object.fromEntries(
      Object.entries({
        ...rootPackage.dependencies,
        ...rootPackage.devDependencies,
      }).map(([k, v]) => [v.replace('link:', ''), k])
    );

    const affectedProjects = files
      .map((f) => f.relativePath)
      .filter((f) => f.endsWith('moon.yml') || f.endsWith('moon.extend.yml'))
      .map((file) => path.dirname(file))
      .filter((v, i, a) => a.indexOf(v) === i) // unique
      .flatMap((dir) => {
        const projectName = dependencyLookup[dir];
        if (!projectName) {
          console.warn(`Could not find project name for path: ${dir}`);
          return [];
        }
        return [projectName];
      });

    if (affectedProjects.length === 0) {
      return;
    }
    log.debug(`Regenerating moon config for projects: ${affectedProjects.join(', ')}`);

    try {
      await import('@kbn/setup-node-env');
      const { regenerateMoonProjects } = await import('@kbn/moon');
      const results = await regenerateMoonProjects({
        filter: affectedProjects,
        update: true,
        dryRun: !options.fix,
        clear: false,
        includeDependencies: true,
        quiet: true,
      });

      if (results.update.length) {
        throw new Error("Some moon.yml files aren't up to date: " + results.update.join(', '));
      }
    } catch (e) {
      throw new Error(`Failed to regenerate moon config - ${e.stdout || e.message}`);
    }
  }
}
