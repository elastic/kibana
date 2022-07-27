/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {run} from '@kbn/dev-cli-runner';
// import { createFlagError, createFailError } from '@kbn/dev-cli-errors';
import {REPO_ROOT} from '@kbn/utils';
import yaml from 'js-yaml';
import {readFileSync} from 'fs';
import {resolve} from 'path';
import {getPrChanges} from '../../../.buildkite/pipeline-utils';
import {filter, from} from 'rxjs';
import {pluck} from 'rxjs/operators';

const flags = {
  string: ['path'],
  help: `
--path             Required, ...
        `,
};

const resolveRoot = resolve.bind(null, REPO_ROOT);

export function runCheckOwnTestsRanCli() {
  run(process, {
    description: `

blah blah blah

      `,
    flags,
  });
}

const roots = () =>
  yaml
    .load(
      readFileSync(
        resolveRoot('src/dev/own_tests_ran/test_roots.yml'), 'utf8'
      )
    )
    .general;

const isTest = (regexes) => (filePath) =>
  regexes
    .some((re) => re.test(filePath));

async function process({flags, log}) {
  log.info('\n### Running runCheckOwnTestsRanCli()');

  console.log(`\n### flags: \n${JSON.stringify(flags, null, 2)}`);

  // TODO-TRE: Next, we need access to the log output, from ci.
  // TODO-TRE: We prolly can use the fileNames above, find the test(s) file(s)
  // TODO-TRE: , find their configs and use the configs and see where they are used in
  // TODO-TRE: , the "pick test group run order" output.
  // TODO-TRE: From there, we should be able to stream through the ouput.
  // TODO-TRE: This link mentions it's possible: https://buildkite.com/docs/apis/rest-api/jobs#get-a-jobs-log-output

  const $ = from(await getPrChanges());
  $.pipe(
    pluck('filename'),
    filter(isTest(roots().map((x) => new RegExp(x)))))
    .subscribe({
      next: (x) => console.log(`\n### x2: \n\t${x}`),
      // next: noop,
      error: (x) => console.error(`\n### x: \n\t${x}`),
      complete: () => console.log('\n### Complete'),
    });
}
