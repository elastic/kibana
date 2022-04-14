/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { writeFileSync } from 'fs';
import path from 'path';
import Mustache from 'mustache';

import { run, createFailError } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';

import { JestConfigs, CONFIG_NAMES } from './configs';

const unitTestingTemplate: string = `module.exports = {
  preset: '@kbn/test',
  rootDir: '{{{relToRoot}}}',
  roots: ['<rootDir>/{{{modulePath}}}'],
};
`;

const integrationTestingTemplate: string = `module.exports = {
  preset: '@kbn/test/jest_integration',
  rootDir: '{{{relToRoot}}}',
  roots: ['<rootDir>/{{{modulePath}}}'],
};
`;

const roots: string[] = [
  'x-pack/plugins/security_solution/public',
  'x-pack/plugins/security_solution/server',
  'x-pack/plugins/security_solution',
  'x-pack/plugins',
  'packages',
  'src/plugins',
  'test',
  'src/core',
  'src',
];

export async function runCheckJestConfigsCli() {
  run(
    async ({ flags: { fix = false }, log }) => {
      const jestConfigs = new JestConfigs(REPO_ROOT, roots);

      const missing = await jestConfigs.allMissing();

      if (missing.length) {
        log.error(
          `The following Jest config files do not exist for which there are test files for:\n${[
            ...missing,
          ]
            .map((file) => ` - ${file}`)
            .join('\n')}`
        );

        if (fix) {
          missing.forEach((file) => {
            const template = file.endsWith(CONFIG_NAMES.unit)
              ? unitTestingTemplate
              : integrationTestingTemplate;

            const modulePath = path.dirname(file);
            const content = Mustache.render(template, {
              relToRoot: path.relative(modulePath, '.'),
              modulePath,
            });

            writeFileSync(file, content);
            log.info('created %s', file);
          });
        } else {
          throw createFailError(
            `Run 'node scripts/check_jest_configs --fix' to create the missing config files`
          );
        }
      }
    },
    {
      description: 'Check that all test files are covered by a Jest config',
      flags: {
        boolean: ['fix'],
        help: `
        --fix           Attempt to create missing config files
      `,
      },
    }
  );
}
