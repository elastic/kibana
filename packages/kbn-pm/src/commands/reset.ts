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

import {
  getBazelDiskCacheFolder,
  getBazelRepositoryCacheFolder,
  isBazelBinAvailable,
  runBazel,
} from '../utils/bazel';
import { isDirectory } from '../utils/fs';
import { log } from '../utils/log';
import { ICommand } from '.';

export const ResetCommand: ICommand = {
  description:
    'Deletes node_modules and output directories, resets internal and disk caches, and stops Bazel server',
  name: 'reset',

  reportTiming: {
    group: 'scripts/kbn reset',
    id: 'total',
  },

  async run(projects, projectGraph, { kbn }) {
    log.warning(dedent`
      In most cases, 'yarn kbn clean' is all that should be needed to recover a consistent state when
      problems arise. However for the rare cases where something get corrupt on node_modules you might need this command.
      If you think you need to use this command very often (which is not normal), please let us know.
    `);

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

    // Runs Bazel hard clean and deletes Bazel Cache Folders
    if (await isBazelBinAvailable(kbn.getAbsolute())) {
      // Hard cleaning bazel
      await runBazel(['clean', '--expunge']);
      log.success('Hard cleaned bazel');

      // Deletes Bazel Cache Folders
      await del([await getBazelDiskCacheFolder(), await getBazelRepositoryCacheFolder()], {
        force: true,
      });
      log.success('Removed disk caches');
    }

    if (toDelete.length === 0) {
      return;
    }

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
  },
};
