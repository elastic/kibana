/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import { run } from '@kbn/dev-cli-runner';
import { pathExists } from '../code_coverage/ingest_coverage/team_assignment/enumeration_helpers';
import { processJunitFiles } from './process_junit_files';

const ROOT = resolve(__dirname, '../../..');
const flags = {
  string: ['path', 'verbose'],
  help: `
--path             Required, path to the junit folder.
        `,
};

export function runServerlessFtrResultsIngestionCli() {
  run(
    ({ log }) => {
      const resolveRoot = resolve.bind(null, ROOT);

      const junitPath = resolveRoot('target/junit');
      pathExists(junitPath)
        .map(() => junitPath)
        .fold(
          (err) => {
            log.error(`\n### x: \n${JSON.stringify(err, null, 2)}`);
          },
          (x) => {
            processJunitFiles(log)(x);
          }
        );
    },
    {
      description: `

blah blah blah
      `,
      flags,
    }
  );
}
