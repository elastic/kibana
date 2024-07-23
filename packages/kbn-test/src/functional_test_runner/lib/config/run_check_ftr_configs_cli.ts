/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import execa from 'execa';
import { readFileSync } from 'fs';
import Path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';

import { getAllFtrConfigsAndManifests } from './ftr_configs_manifest';

const THIS_PATH = Path.resolve(
  REPO_ROOT,
  'packages/kbn-test/src/functional_test_runner/lib/config/run_check_ftr_configs_cli.ts'
);
const THIS_REL = Path.relative(REPO_ROOT, THIS_PATH);

const IGNORED_PATHS = [
  THIS_PATH,
  Path.resolve(REPO_ROOT, 'packages/kbn-test/src/jest/run_check_jest_configs_cli.ts'),
];

export async function runCheckFtrConfigsCli() {
  run(
    async ({ log }) => {
      const { stdout } = await execa('git', [
        'ls-tree',
        '--full-tree',
        '--name-only',
        '-r',
        'HEAD',
      ]);

      const files = stdout
        .trim()
        .split('\n')
        .map((file) => Path.resolve(REPO_ROOT, file));

      const possibleConfigs = files.filter((file) => {
        if (IGNORED_PATHS.includes(file)) {
          return false;
        }

        if (!file.match(/(test|e2e).*config[^\/]*\.(t|j)s$/)) {
          return false;
        }

        if (file.match(/\/__(fixtures|tests)__\//)) {
          return false;
        }

        if (file.match(/\.test\.(t|j)s$/)) {
          return false;
        }

        if (file.match(/\/common\/config.(t|j)s$/)) {
          return false;
        }

        if (file.match(/(jest(\.integration)?)\.config\.(t|j)s$/)) {
          return false;
        }

        if (file.match(/mocks.ts$/)) {
          return false;
        }

        const fileContent = readFileSync(file).toString();

        if (fileContent.match(/(testRunner)|(testFiles)/)) {
          // test config
          return true;
        }

        if (fileContent.match(/(describe)|(defineCypressConfig)/)) {
          // test file or Cypress config
          return false;
        }

        // FTR config file should have default export
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const exports = require(file);
          const defaultExport = exports.__esModule ? exports.default : exports;
          return !!defaultExport;
        } catch (err) {
          log.debug(`Failed to load file: ${err.message}`);
          return false;
        }
      });

      const { allFtrConfigs, manifestPaths } = getAllFtrConfigsAndManifests();

      const invalid = possibleConfigs.filter((path) => !allFtrConfigs.includes(path));
      if (invalid.length) {
        const invalidList = invalid.map((path) => Path.relative(REPO_ROOT, path)).join('\n  - ');
        log.error(
          `The following files look like FTR configs which are not listed in one of manifest files:\n${invalidList}\n
Make sure to add your new FTR config to the correct manifest file.\n
Stateful tests:\n${(manifestPaths.stateful as string[]).join('\n')}\n
Serverless tests:\n${(manifestPaths.serverless as string[]).join('\n')}
          `
        );
        throw createFailError(
          `Please add the listed paths to the correct manifest files. If it's not an FTR config, you can add it to the IGNORED_PATHS in ${THIS_REL} or contact #kibana-operations`
        );
      }
    },
    {
      description: 'Check that all FTR configs are listed in manifest files',
    }
  );
}
