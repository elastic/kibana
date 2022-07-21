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

const flags = {
  string: ['path'],
  help: `
--path             Required, ...
        `,
};

export function runCheckOwnTestsRanCli() {
  run(
    ({ flags, log }) => {
      console.log('\n### Running runCheckOwnTestsRanCli()');
      console.log(`\n### REPO_ROOT: \n\t${REPO_ROOT}`);
    },
    {
      description: `

blah blah blah

      `,
      flags,
    }
  );
}
