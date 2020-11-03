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

import execa from 'execa';
import Path from 'path';
import { run, ToolingLog } from '@kbn/dev-utils';

export async function buildAllRefs(log: ToolingLog) {
  await buildRefs(log, 'tsconfig.refs.json');
  await buildRefs(log, Path.join('x-pack', 'tsconfig.refs.json'));
}

async function buildRefs(log: ToolingLog, projectPath: string) {
  try {
    log.debug(`Building TypeScript projects refs for ${projectPath}...`);
    await execa(require.resolve('typescript/bin/tsc'), ['-b', projectPath, '--pretty']);
  } catch (e) {
    log.error(e);
    process.exit(1);
  }
}

export async function runBuildRefs() {
  run(
    async ({ log }) => {
      await buildAllRefs(log);
    },
    {
      description: 'Build TypeScript projects',
    }
  );
}
