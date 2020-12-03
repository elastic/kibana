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

import { relative, resolve, sep } from 'path';
import { writeFileSync } from 'fs';

import execa from 'execa';
import globby from 'globby';
import Mustache from 'mustache';

import { run } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';

// @ts-ignore
import { testMatch } from '../../jest-preset';

const template: string = `module.exports = {
  preset: '@kbn/test',
  rootDir: '{{{relToRoot}}}',
  roots: ['<rootDir>/{{{modulePath}}}'],
};
`;

const roots: string[] = ['x-pack/plugins', 'packages', 'src/legacy', 'src/plugins', 'test', 'src'];

export async function runCheckJestConfigsCli() {
  run(
    async ({ flags: { fix = false }, log }) => {
      const { stdout: coveredFiles } = await execa(
        'yarn',
        ['--silent', 'jest', '--listTests', '--json'],
        {
          cwd: REPO_ROOT,
        }
      );

      const allFiles = new Set(
        await globby(testMatch.concat(['!**/integration_tests/**']), {
          gitignore: true,
        })
      );

      JSON.parse(coveredFiles).forEach((file: string) => {
        const pathFromRoot = relative(REPO_ROOT, file);
        allFiles.delete(pathFromRoot);
      });

      if (allFiles.size) {
        log.error(
          `The following files do not belong to a jest.config.js file, or that config is not included from the root jest.config.js\n${[
            ...allFiles,
          ]
            .map((file) => ` - ${file}`)
            .join('\n')}`
        );
      } else {
        log.success('All test files are included by a Jest configuration');
        return;
      }

      if (fix) {
        allFiles.forEach((file) => {
          const root = roots.find((r) => file.startsWith(r));

          if (root) {
            const name = relative(root, file).split(sep)[0];
            const modulePath = [root, name].join('/');

            const content = Mustache.render(template, {
              relToRoot: relative(modulePath, '.'),
              modulePath,
            });

            writeFileSync(resolve(root, name, 'jest.config.js'), content);
          } else {
            log.warning(`Unable to determind where to place jest.config.js for ${file}`);
          }
        });
      } else {
        log.info(
          `Run 'node scripts/check_jest_configs --fix' to attempt to create the missing config files`
        );
      }

      process.exit(1);
    },
    {
      description: 'Check that all test files are covered by a jest.config.js',
      flags: {
        boolean: ['fix'],
        help: `
        --fix           Attempt to create missing config files
      `,
      },
    }
  );
}
