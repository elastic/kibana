/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-cli-runner';
// import { createFlagError, createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/utils';
import yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getPrChanges } from '../../../.buildkite/pipeline-utils';

const flags = {
  string: ['path'],
  help: `
--path             Required, ...
        `,
};

const resolveRoot = resolve.bind(null, REPO_ROOT);

export function runCheckOwnTestsRanCli() {
  run(
    async ({ flags, log }) => {
      log.info('\n### Running runCheckOwnTestsRanCli()');

      console.log(`\n### flags: \n${JSON.stringify(flags, null, 2)}`);

      yaml
        .load(readFileSync(resolveRoot('src/dev/own_tests_ran/test_roots.yml'), 'utf8'))
        .general.forEach((x) => console.log(`\n### x: \n\t${x}`));

      const res = await getPrChanges();
      console.log(`\n### res: \n${JSON.stringify(res, null, 2)}`);
    },
    {
      description: `

blah blah blah

      `,
      flags,
    }
  );
}
