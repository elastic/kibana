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

import { run } from '@kbn/dev-utils';
import { TEAM_ASSIGNMENT_PIPELINE_NAME } from '../constants';
import { fetch } from './get_data';
import { update } from './update_ingest_pipeline';

const updatePipeline = update(TEAM_ASSIGNMENT_PIPELINE_NAME);

const execute = ({ flags, log }) => {
  if (flags.verbose) log.verbose(`### Verbose logging enabled`);

  const logLeft = handleErr(log);
  const updateAndLog = updatePipeline(log);

  const { path } = flags;

  fetch(path).fold(logLeft, updateAndLog);
};

function handleErr(log) {
  return (msg) => log.error(msg);
}

const description = `

Upload the latest team assignment pipeline def from src,
to the cluster.

      `;

const flags = {
  string: ['path', 'verbose'],
  help: `
--path             Required, path to painless definition for team assignment.
        `,
};

const usage = 'node scripts/load_team_assignment.js --verbose --path PATH_TO_PAINLESS_SCRIPT.json';

export const uploadTeamAssignmentJson = () => run(execute, { description, flags, usage });
