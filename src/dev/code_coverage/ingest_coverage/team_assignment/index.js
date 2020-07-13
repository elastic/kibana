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

import { run, createFlagError } from '@kbn/dev-utils';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../../../..');
const resolveRoot = resolve.bind(null, ROOT);
const flags = {
  string: ['jsonPath', 'verbose'],
  help: `
--jsonPath         Required, path to the canonical definition of team assignment ingest pipeline.
        `,
};

export const uploadTeamAssignmentJson = () => {
  run(
    ({ flags, log }) => {
      if (flags.jsonPath === '') throw createFlagError('please provide a single --jsonPath flag');
      if (flags.verbose) log.verbose(`### Verbose logging enabled`);

      const resolveRoot = resolve.bind(null, ROOT);
      const pipelineDefintionPath = resolveRoot(flags.jsonPath);
      prok({ jsonSummaryPath, vcsInfoFilePath }, log);
    },
    {
      description: `

Upload the latest team assignment pipeline def from src,
to the cluster.


Examples:

node scripts/load_team_assignment.js --verbose --jsonPath CURRENT_TEAM_ASSIGN_PATH

      `,
      flags,
    }
  );

  // get current

  // push updated
};

const current = (_) => {};
const upload = (_) => {};
