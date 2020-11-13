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

import Fs from 'fs';
import Path from 'path';

import execa from 'execa';

import { BuildContext } from '../build_context';

const winVersion = (path: string) => (process.platform === 'win32' ? `${path}.cmd` : path);

export async function yarnInstall({ log, buildDir, config }: BuildContext) {
  const pkgJson = Path.resolve(buildDir, 'package.json');

  if (config?.skipInstallDependencies || !Fs.existsSync(pkgJson)) {
    return;
  }

  log.info('running yarn to install dependencies');
  await execa(winVersion('yarn'), ['install', '--production', '--pure-lockfile'], {
    cwd: buildDir,
  });
}
