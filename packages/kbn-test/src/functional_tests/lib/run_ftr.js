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

import { KIBANA_FTR_SCRIPT, PROJECT_ROOT } from './paths';

export async function runFtr({
  procs,
  configPath,
  bail,
  log,
  cwd = PROJECT_ROOT,
}) {
  const args = [KIBANA_FTR_SCRIPT];

  if (getLogFlag(log)) args.push(`--${getLogFlag(log)}`);
  if (bail) args.push('--bail');
  if (configPath) args.push('--config', configPath);

  await procs.run('ftr', {
    cmd: 'node',
    args,
    cwd,
    wait: true,
  });
}

function getLogFlag(log) {
  const level = log.getLevel();

  if (level === 'info') return null;
  return level === 'error' ? 'quiet' : level;
}
