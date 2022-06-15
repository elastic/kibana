/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fsp from 'fs/promises';
import Path from 'path';
import Mustache from 'mustache';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/utils';
import { discoverBazelPackageLocations } from '@kbn/bazel-packages';

import {
  getAllTestFiles,
  groupTestFiles,
  findMissingConfigFiles,
  UNIT_CONFIG_NAME,
} from './configs';

const unitTestingTemplate: string = `module.exports = {
  preset: '@kbn/test/jest_node',
  rootDir: '{{{relToRoot}}}',
  roots: ['<rootDir>/{{{modulePath}}}'],
};
`;

const integrationTestingTemplate: string = `module.exports = {
  preset: '@kbn/test/jest_integration_node',
  rootDir: '{{{relToRoot}}}',
  roots: ['<rootDir>/{{{modulePath}}}'],
};
`;

const roots: string[] = [
  'x-pack/plugins/security_solution/public',
  'x-pack/plugins/security_solution/server',
  'x-pack/plugins/security_solution',
  'x-pack/plugins',
  'src/plugins',
  'test',
  'src/core',
  'src',
].map((rel) => Path.resolve(REPO_ROOT, rel));

export async function runCheckJestConfigsCli() {
  run(
    async ({ flags: { fix = false }, log }) => {
      const packageDirs = [
        ...discoverBazelPackageLocations(REPO_ROOT),
        // kbn-pm is a weird package currently and needs to be added explicitly
        Path.resolve(REPO_ROOT, 'packages/kbn-pm'),
      ];

      const testFiles = await getAllTestFiles();
      const { grouped, invalid } = groupTestFiles(testFiles, roots, packageDirs);

      if (invalid.length) {
        const paths = invalid.map((path) => Path.relative(REPO_ROOT, path)).join('\n  - ');
        log.error(
          `The following test files exist outside packages or pre-defined roots:\n  - ${paths}`
        );
        throw createFailError(
          `Move the above files a pre-defined test root, a package, or configure an additional root to handle this file.`
        );
      }

      const missing = await findMissingConfigFiles(grouped);

      if (missing.length) {
        log.error(
          `The following Jest config files do not exist for which there are test files for:\n${[
            ...missing,
          ]
            .map((file) => ` - ${file}`)
            .join('\n')}`
        );

        if (fix) {
          for (const file of missing) {
            const template =
              Path.basename(file) === UNIT_CONFIG_NAME
                ? unitTestingTemplate
                : integrationTestingTemplate;

            const modulePath = Path.dirname(file);
            const content = Mustache.render(template, {
              relToRoot: Path.relative(modulePath, REPO_ROOT),
              modulePath,
            });

            await Fsp.writeFile(file, content);
            log.info('created %s', file);
          }
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
