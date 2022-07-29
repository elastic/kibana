/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-cli-runner';
// import { createFlagError, createFailError } from '@kbn/dev-cli-errors';
import { getPrChanges } from '../../../.buildkite/pipeline-utils';
import { filter, from, mergeMap } from 'rxjs';
import { pluck } from 'rxjs/operators';
import { testDirectoryRegexes, isTest } from './helpers';
import { findConfigFile } from './find_config_file';

const flags = {
  string: ['path'],
  boolean: ['mock'],
  help: `
--path             Required, ...
        `,
};

export function runCheckOwnTestsRanCli() {
  run(process, {
    description: `

blah blah blah

      `,
    flags,
  });
}

async function process({ flags, log }) {
  log.info('\n### Running runCheckOwnTestsRanCli()');

  const isTestWith = isTest(
    testDirectoryRegexes('src/dev/own_tests_ran/test_roots.yml')
  );

  from(flags.mock ? mockData() : await getPrChanges())
    .pipe(
      pluck('filename'),
      filter(isTestWith),
      mergeMap(async (x) => await findConfigFile(x))
    )
    .subscribe({
      next: (x) => console.log(`\n### Config: \n\t${x}`),
      // next: noop,
      error: (x) => console.error(`\n### x: \n\t${x}`),
      complete: () => console.log('\n### Complete'),
    });
}

function mockData() {
  return [
    {
      filename: 'x-pack/test/functional/apps/discover/feature_controls/discover_spaces.ts',
    },
    {
      filename:
        'x-pack/test/functional/apps/advanced_settings/feature_controls/advanced_settings_security.ts',
    },
  ];
}
