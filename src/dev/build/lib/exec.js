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
import chalk from 'chalk';

import { watchStdioForLine } from '../../../legacy/utils';

export async function exec(log, cmd, args, options = {}) {
  const { level = 'debug', cwd, env, exitAfter } = options;

  log[level](chalk.dim('$'), cmd, ...args);

  const proc = execa(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd,
    env,
    preferLocal: true,
  });

  await watchStdioForLine(proc, line => log[level](line), exitAfter);
}
