/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';

import { getPackages } from '@kbn/repo-packages';
import {
  buildMoonProjectDirLookup,
  getMoonAffectedProjectNames,
  isMoonGeneratorInput,
} from '@kbn/moon/src/generator_inputs';
import { REPO_ROOT } from '../kbn_pm/src/lib/paths.mjs';

import { PrecommitCheck } from './precommit_check';

export class MoonConfigGenerationCheck extends PrecommitCheck {
  constructor() {
    super('Moon Config');
  }

  shouldExecute({ files, deletedFiles }) {
    return files.concat(deletedFiles).some((f) => isMoonGeneratorInput(f.getRelativePath()));
  }

  async execute(log, files, options) {
    const projectLookup = buildMoonProjectDirLookup(getPackages(REPO_ROOT));
    const affectedProjects = getMoonAffectedProjectNames(
      files.map((f) => f.getRelativePath()),
      projectLookup
    );

    const unmapped = files
      .map((f) => f.getRelativePath())
      .filter((rel) => isMoonGeneratorInput(rel))
      .map((rel) => path.dirname(rel))
      .filter((dir) => dir && dir !== '.' && !projectLookup[dir]);

    if (unmapped.length) {
      log.warning(
        `Moon config check: no kibana package at ${unmapped.join(', ')} (not in repo package list)`
      );
    }

    if (affectedProjects.length === 0) {
      return;
    }
    log.debug(`Regenerating moon config for projects: ${affectedProjects.join(', ')}`);

    try {
      if (!process.argv[1]) {
        process.argv[1] = path.join(REPO_ROOT, 'scripts/precommit_hook.js');
      }
      await import('@kbn/setup-node-env');
      const { regenerateMoonProjects } = require('@kbn/moon');
      const results = await regenerateMoonProjects({
        filter: affectedProjects,
        update: true,
        dryRun: !options.fix,
        clear: false,
        includeDependencies: true,
        log,
      });

      const touchedFiles = results.update.concat(results.create);
      if (!options.fix && touchedFiles.length) {
        throw new Error("Some moon.yml files aren't up to date: " + touchedFiles.join(', '));
      }
    } catch (e) {
      throw new Error(`Failed to regenerate moon config - ${e.stdout || e.message}`);
    }
  }
}
