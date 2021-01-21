/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import del from 'del';
import ora from 'ora';
import { join, relative } from 'path';

import { isDirectory } from '../utils/fs';
import { log } from '../utils/log';
import { ICommand } from './';

export const CleanCommand: ICommand = {
  description: 'Remove the node_modules and target directories from all projects.',
  name: 'clean',

  async run(projects) {
    const toDelete = [];
    for (const project of projects.values()) {
      if (await isDirectory(project.nodeModulesLocation)) {
        toDelete.push({
          cwd: project.path,
          pattern: relative(project.path, project.nodeModulesLocation),
        });
      }

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
