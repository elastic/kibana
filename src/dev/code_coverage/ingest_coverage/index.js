/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
