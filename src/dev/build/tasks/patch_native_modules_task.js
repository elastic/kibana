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

import { scanCopy, untar, deleteAll } from '../lib';
import { createWriteStream } from 'fs';
import { binaryInfo } from '../../../../x-pack/plugins/code/tasks/nodegit_info';
import wreck from 'wreck';
import mkdirp from 'mkdirp';
import { dirname, join, basename } from 'path';
import { createPromiseFromStreams } from '../../../legacy/utils/streams';

async function download(url, destination, log) {
  const response = await wreck.request('GET', url);

  if (response.statusCode !== 200) {
    throw new Error(
      `Unexpected status code ${response.statusCode} when downloading ${url}`
    );
  }
  mkdirp.sync(dirname(destination));
  await createPromiseFromStreams([
    response,
    createWriteStream(destination)
  ]);
  log.debug('Downloaded ', url);
}

async function downloadAndExtractTarball(url, dest, log, retry) {
  try {
    await download(url, dest, log);
    const extractDir = join(dirname(dest), basename(dest, '.tar.gz'));
    await untar(dest, extractDir, {
      strip: 1
    });
    return extractDir;
  } catch (e) {
    if (retry > 0) {
      await downloadAndExtractTarball(url, dest, log, retry - 1);
    } else {
      throw e;
    }
  }
}

async function patchNodeGit(config, log, build, platform) {
  const plat = platform.isWindows() ? 'win32' : platform.getName();
  const arch = platform.getNodeArch().split('-')[1];
  const { downloadUrl, packageName } = binaryInfo(plat, arch);

  const downloadPath = build.resolvePathForPlatform(platform, '.nodegit_binaries', packageName);
  const extractDir = await downloadAndExtractTarball(downloadUrl, downloadPath, log, 3);

  const destination = build.resolvePathForPlatform(platform, 'node_modules/@elastic/nodegit/build/Release');
  log.debug('Replacing nodegit binaries from ', extractDir);
  await deleteAll([destination], log);
  await scanCopy({
    source: extractDir,
    destination: destination,
    time: new Date(),
  });
  await deleteAll([extractDir, downloadPath], log);
}



export const PatchNativeModulesTask = {
  description: 'Patching platform-specific native modules directories',
  async run(config, log, build) {
    await Promise.all(config.getTargetPlatforms().map(async platform => {
      if (!build.isOss()) {
        await patchNodeGit(config, log, build, platform);
      }
    }));
  }
};
