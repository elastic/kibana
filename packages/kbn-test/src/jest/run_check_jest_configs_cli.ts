/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
