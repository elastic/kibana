/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';
import del from 'del';
import ora from 'ora';
import { join, relative } from 'path';

import { isBazelBinAvailable, runBazel } from '../utils/bazel';
import { isDirectory } from '../utils/fs';
import { log } from '../utils/log';
import { ICommand } from './';

export const CleanCommand: ICommand = {
  description: 'Deletes output directories and resets internal caches.',
  name: 'clean',

  reportTiming: {
    group: 'scripts/kbn clean',
    id: 'total',
  },

  async run(projects, projectGraph, { kbn }) {
    log.warning(dedent`
      This command is only necessary for the circumstance where you need to recover a consistent
      state when problems arise. If you need to run this command often, please let us know by
      filling out this form: https://ela.st/yarn-kbn-clean.
      Please not it might not solve problems with node_modules. To solve problems around node_modules
      you might need to run 'yarn kbn reset'.
    `);

    const toDelete = [];
    for (const project of projects.values()) {
      if (await isDirectory(project.targetLocation)) {
        toDelete.push({
          cwd: project.path,
          pattern: relative(project.path, project.targetLocation),
        });
      }

      const { extraPatterns } = project.getCleanConfig();
      if (extraPatterns) {
        toDelete.push({
          cwd: project.path,
          pattern: extraPatterns,
        });
      }
    }

    // Runs Bazel soft clean
    if (await isBazelBinAvailable(kbn.getAbsolute())) {
      await runBazel(['clean']);
      log.success('Soft cleaned bazel');
    }

    if (toDelete.length === 0) {
      log.success('Nothing to delete');
    } else {
      /**
       * In order to avoid patterns like `/build` in packages from accidentally
       * impacting files outside the package we use `process.chdir()` to change
       * the cwd to the package and execute `del()` without the `force` option
       * so it will check that each file being deleted is within the package.
       *
       * `del()` does support a `cwd` option, but it's only for resolving the
       * patterns and does not impact the cwd check.
       */
      const originalCwd = process.cwd();
      try {
        for (const { pattern, cwd } of toDelete) {
          process.chdir(cwd);
          const promise = del(pattern);

          if (log.wouldLogLevel('info')) {
            ora.promise(promise, relative(originalCwd, join(cwd, String(pattern))));
          }

          await promise;
        }
      } finally {
        process.chdir(originalCwd);
      }
    }
  },
};
