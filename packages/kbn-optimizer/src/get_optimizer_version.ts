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

import Path from 'path';
import { createHash } from 'crypto';

import execa from 'execa';
import { REPO_ROOT } from '@kbn/dev-utils';
import { getMtimes } from './get_mtimes';
import { getChanges } from './get_changes';
import { ascending } from './common';

const OPTIMIZER_DIR = Path.dirname(require.resolve('../package.json'));
const RELATIVE_DIR = Path.relative(REPO_ROOT, OPTIMIZER_DIR);

async function getLastCommit() {
  const { stdout } = await execa(
    'git',
    ['log', '-n', '1', '--pretty=format:%H', '--', RELATIVE_DIR],
    {
      cwd: REPO_ROOT,
    }
  );

  return stdout.trim() || undefined;
}

export async function getOptimizerVersion() {
  const cacheLines: string[] = [];

  cacheLines.push(`lastCommit:${await getLastCommit()}`);

  const changes = (await getChanges(REPO_ROOT, [OPTIMIZER_DIR])).get(OPTIMIZER_DIR);
  if (changes) {
    const mtimes = await getMtimes(changes.keys());
    for (const [path, mtime] of mtimes) {
      cacheLines.push(`mtime:${path}:${mtime}`);
    }
  }

  return createHash('sha1')
    .update(cacheLines.sort((a, b) => a.localeCompare(b)).join('\n'))
    .digest('hex');
}
