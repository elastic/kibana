/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { checkSavedObjects } from '../check_saved_objects';

export function runCheckSavedObjectsCli() {
  const scriptName = process.argv[1].replace(/^.*scripts\//, 'scripts/');

  run(
    async ({ log, flagsReader }) => {
      const gitRev = flagsReader.string('gitRev');
      const fix = flagsReader.boolean('fix');

      if (!gitRev) {
        throw new Error(
          'No baseline SHA provided, cannot check changes in Saved Objects. Please provide a --baseline <gitRev>'
        );
      } else {
        await checkSavedObjects({ gitRev, log, fix });
        process.exit(0);
      }
    },
    {
      description: `
      Determine if the changes performed to the Saved Objects mappings are following our standards.

      Usage: node ${scriptName} --baseline <gitRev>
    `,
      flags: {
        alias: {
          baseline: 'gitRev',
        },
        boolean: ['fix'],
        string: ['gitRev'],
        default: {
          verify: true,
          mappings: true,
        },
        help: `
        --baseline <SHA>   Provide a commit SHA, to use as a baseline for comparing SO changes against
      `,
      },
    }
  );
}
