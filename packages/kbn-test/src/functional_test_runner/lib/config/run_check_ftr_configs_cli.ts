/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import execa from 'execa';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/utils';
import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';

import { FTR_CONFIGS_MANIFEST_PATHS } from './ftr_configs_manifest';

export async function runCheckFtrConfigsCli() {
  run(
    async () => {
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
        .map((file) => resolve(REPO_ROOT, file));

      const possibleConfigs = files.filter((file) => {
        if (file.includes('run_check_ftr_configs_cli.ts')) {
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

        return readFileSync(file)
          .toString()
          .match(/(testRunner)|(testFiles)/);
      });

      for (const config of possibleConfigs) {
        if (!FTR_CONFIGS_MANIFEST_PATHS.includes(config)) {
          throw createFailError(
            `${config} looks like a new FTR config. Please add it to .buildkite/ftr_configs.yml. If it's not an FTR config, please contact #kibana-operations`
          );
        }
      }
    },
    {
      description: 'Check that all FTR configs are in .buildkite/ftr_configs.yml',
    }
  );
}
