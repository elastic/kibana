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
import install from '@elastic/simple-git/scripts/install';
import { deleteAll } from '../lib';
import path from 'path';

async function patchGit(config, log, build, platform) {
  const downloadPath = build.resolvePathForPlatform(platform, '.git_binaries', 'git.tar.gz');
  const destination = build.resolvePathForPlatform(
    platform,
    'node_modules/@elastic/simple-git/native/git'
  );
  log.debug('Replacing git binaries from ' + downloadPath + ' to ' + destination);
  const p = platform.isWindows() ? 'win32' : platform.getName();
  await deleteAll([destination]);
  await install(p, downloadPath, destination);
  await deleteAll([path.dirname(downloadPath)], log);
}

export const PatchNativeModulesTask = {
  description: 'Patching platform-specific native modules directories',
  async run(config, log, build) {
    await Promise.all(
      config.getTargetPlatforms().map(async platform => {
        if (!build.isOss()) {
          await patchGit(config, log, build, platform);
        }
      })
    );
  },
};
