/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import { prok } from './process';
import { run } from '@kbn/dev-cli-runner';
import { createFlagError, createFailError } from '@kbn/dev-cli-errors';
import { pathExists } from './team_assignment/enumeration_helpers';
import { always, ccMark } from './utils';

const ROOT = resolve(__dirname, '../../../..');
const flags = {
  string: ['path', 'verbose', 'vcsInfoPath', 'teamAssignmentsPath'],
  help: `
--path             Required, path to the file to extract coverage data
--vcsInfoPath      Required, path to the git info file (branch, sha, author, & commit msg)
--teamAssignmentsPath  Required, path to the team assignments data file
        `,
};

export function runCoverageIngestionCli() {
  run(
    ({ flags, log }) => {
      guard(flags);

      const resolveRoot = resolve.bind(null, ROOT);
      const jsonSummaryPath = resolveRoot(flags.path);
      const vcsInfoFilePath = resolveRoot(flags.vcsInfoPath);
      const teamAssignmentsPath = resolveRoot(flags.teamAssignmentsPath);

      pathExists(jsonSummaryPath)
        .chain(always(pathExists(teamAssignmentsPath)))
        .chain(always(pathExists(vcsInfoFilePath)))
        .fold(
          (pathNotFound) => {
            throw createFailError(
              errMsg(pathNotFound)(jsonSummaryPath, teamAssignmentsPath, vcsInfoFilePath)
            );
          },
          () => prok({ jsonSummaryPath, vcsInfoFilePath, teamAssignmentsPath }, log)
        );
    },
    {
      description: `

Post code coverage in json-summary format to an ES index.
Note: You probably should create the index first.
Two indexes are needed, see README.md.

Examples:

See 'ingest_code_coverage_readme.md'

      `,
      flags,
    }
  );
}

function guard(flags) {
  ['path', 'vcsInfoPath', 'teamAssignmentsPath'].forEach((x) => {
    if (flags[x] === '') throw createFlagError(`please provide a single --${x} flag`);
  });
}

function errMsg(x) {
  return (...inputFiles) => `
${ccMark} ${x}
${ccMark} Input Files: \n${JSON.stringify(inputFiles, null, 2)}
${ccMark} If the input files you passed in exist...
${ccMark} Maybe you should "Generate the team assignments", like this:

${ccMark} λ> node scripts/generate_team_assignments.js --verbose --src .github/CODEOWNERS --dest src/dev/code_coverage/ingest_coverage/team_assignment/team_assignments.txt
`;
}
