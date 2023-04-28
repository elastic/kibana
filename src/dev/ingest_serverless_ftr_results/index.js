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
import { REPO_ROOT } from '@kbn/repo-info';

const flags = {
  string: ['path', 'verbose'],
  help: `
--path             Required, path to the junit folder.
        `,
};

const resolveRoot = resolve.bind(null, REPO_ROOT);

// What I'd love to get is a high level summary of the test run, something like this:
// Total test cases: X
// Passed: A
// Skipped: B
// Failed: C
// Ideally even broken down by the high level test type (Jest, API integration, functional UI),
// but that's just a nice-to-have.
// Do you think you could get me these numbers?
export function runServerlessFtrResultsIngestionCli() {
  run(
    ({ log }) => {
      const junitPath = resolveRoot('target/junit');

      pathExists(junitPath)
        .map(patterns)
        .fold(
          (err) => log.error(`\n### x: \n${JSON.stringify(err, null, 2)}`),
          processJunitFiles(log)
        );
    },
    {
      description: `
Ingests mocha generated junit xml files (failures).
      `,
      flags,
    }
  );
}
function patterns() {
  return [resolveRoot('target/junit/**/*.xml')];
}
