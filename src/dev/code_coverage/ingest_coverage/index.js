/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';
import { prok } from './process';
import { run, createFlagError } from '@kbn/dev-utils';
import { pathExists } from './team_assignment/enumeration_helpers';
import { id, reThrow } from './utils';

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
      if (flags.path === '') throw createFlagError('please provide a single --path flag');
      if (flags.vcsInfoPath === '')
        throw createFlagError('please provide a single --vcsInfoPath flag');
      if (flags.teamAssignmentsPath === '')
        throw createFlagError('please provide a single --teamAssignments flag');
      if (flags.verbose) log.verbose(`Verbose logging enabled`);

      const resolveRoot = resolve.bind(null, ROOT);
      const jsonSummaryPath = resolveRoot(flags.path);
      const vcsInfoFilePath = resolveRoot(flags.vcsInfoPath);
      const { teamAssignmentsPath } = flags;

      pathExists(teamAssignmentsPath).fold(reThrow, id);

      prok({ jsonSummaryPath, vcsInfoFilePath, teamAssignmentsPath }, log);
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
