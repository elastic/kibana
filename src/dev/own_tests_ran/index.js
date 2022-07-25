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

      // TODO-TRE: We may or may not use this test roots idea.
      yaml
        .load(readFileSync(resolveRoot('src/dev/own_tests_ran/test_roots.yml'), 'utf8'))
        .general.forEach((x) => console.log(`\n### x: \n\t${x}`));

      // TODO-TRE: This gets the info I need about the pr (filenames, etc)
      const xs = await getPrChanges();
      console.log(`\n### xs: \n${JSON.stringify(xs, null, 2)}`);

      const fileNames = xs.map((x) => x.filename);

      console.log(`\n### fileNames: \n${JSON.stringify(fileNames, null, 2)}`);

      // TODO-TRE: Next, we need access to the log output, from ci.
      // TODO-TRE: We prolly can use the fileNames above, find the test(s) file(s)
      // TODO-TRE: , find their configs and use the configs and see where they are used in
      // TODO-TRE: , the "pick test group run order" output.
      // TODO-TRE: From there, we should be able to stream through the ouput.
      // TODO-TRE: This link mentions it's possible: https://buildkite.com/docs/apis/rest-api/jobs#get-a-jobs-log-output

    },
    {
      description: `

blah blah blah

      `,
      flags,
    }
  );
}
