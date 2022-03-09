/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs/promises';

import execa from 'execa';
import { safeLoad } from 'js-yaml';

import { run } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';
import { schema } from '@kbn/config-schema';

const RELATIVE_JOBS_YAML_PATH = '.ci/ci_groups.yml';
const JOBS_YAML_PATH = Path.resolve(REPO_ROOT, RELATIVE_JOBS_YAML_PATH);
const SCHEMA = schema.object({
  root: schema.arrayOf(schema.string()),
  xpack: schema.arrayOf(schema.string()),
});

export function runEnsureAllTestsInCiGroupsCli() {
  run(async ({ log }) => {
    const { root, xpack } = SCHEMA.validate(safeLoad(await Fs.readFile(JOBS_YAML_PATH, 'utf-8')));

    log.info(
      'validating root tests directory contains all "root" ciGroups from',
      RELATIVE_JOBS_YAML_PATH
    );
    await execa(process.execPath, [
      'scripts/functional_tests',
      ...root.map((tag) => `--include-tag=${tag}`),
      '--include-tag=runOutsideOfCiGroups',
      '--assert-none-excluded',
    ]);

    log.info(
      'validating x-pack/tests directory contains all "xpack" ciGroups from',
      RELATIVE_JOBS_YAML_PATH
    );
    await execa(process.execPath, [
      'x-pack/scripts/functional_tests',
      ...xpack.map((tag) => `--include-tag=${tag}`),
      '--assert-none-excluded',
    ]);

    log.success('all tests are in a valid ciGroup');
  });
}
