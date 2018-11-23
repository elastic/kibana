/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import chalk from 'chalk';
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
      log.write(chalk.bold.green('\n\nNothing to delete'));
    } else {
      log.write(chalk.bold.red('\n\nDeleting:\n'));

      const originalCwd = process.cwd();
      try {
        for (const { pattern, cwd } of toDelete) {
          process.chdir(cwd);
          const promise = del(pattern);
          ora.promise(promise, relative(originalCwd, join(cwd, String(pattern))));
          await promise;
        }
      } finally {
        process.chdir(originalCwd);
      }
    }
  },
};
