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
import { KIBANA_ROOT, KIBANA_EXEC, KIBANA_EXEC_PATH } from './paths';

export async function runKibanaServer({ procs, config, options }) {
  const { installDir } = options;

  await procs.run('kibana', {
    cmd: getKibanaCmd(installDir),
    args: getCliArgs(config, options),
    env: {
      FORCE_COLOR: 1,
      ...process.env,
    },
    cwd: installDir || KIBANA_ROOT,
    wait: /Server running/,
  });
}

function getKibanaCmd(installDir) {
  if (installDir) {
    return process.platform.startsWith('win')
      ? resolve(installDir, 'bin/kibana.bat')
      : resolve(installDir, 'bin/kibana');
  }

  return KIBANA_EXEC;
}

function getCliArgs(config, { devMode, installDir }) {
  const buildArgs = config.get('kbnTestServer.buildArgs') || [];
  const sourceArgs = config.get('kbnTestServer.sourceArgs') || [];
  const serverArgs = config.get('kbnTestServer.serverArgs') || [];

  if (devMode) serverArgs.push('--dev');

  return installDir
    ? [...serverArgs, ...buildArgs]
    : [KIBANA_EXEC_PATH, ...serverArgs, ...sourceArgs];
}
