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
import { writeSync, openSync, existsSync, unlinkSync } from 'fs';
import binaryInfo from 'nodegit/lib/utils/binary_info';
import wreck from 'wreck';
import mkdirp from 'mkdirp';
import { dirname, join, basename } from 'path';

async function download(url, destination, log) {
  const response = await wreck.request('GET', url);

  if (response.statusCode !== 200) {
    throw new Error(
      `Unexpected status code ${response.statusCode} when downloading ${url}`
    );
  }
  mkdirp.sync(dirname(destination));
  const fileHandle = openSync(destination, 'w');

  await new Promise((resolve, reject) => {
    response.on('data', chunk => {
      writeSync(fileHandle, chunk);
    });

    response.on('error', (err) => {
      if (existsSync(destination)) {
        // remove the unfinished file
        unlinkSync(destination);
      }
      reject(err);
    });
    response.on('end', () => {
      log.debug('Downloaded ', url);
      resolve();
    });
  });

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
  const info = binaryInfo(plat, arch);
  const downloadUrl = info.hosted_tarball;
  const packageName = info.package_name;
  const downloadPath = config.resolveFromRepo('.nodegit_binaries', packageName);
  const extractDir = await downloadAndExtractTarball(downloadUrl, downloadPath, log, 3);

  const destination = build.resolvePathForPlatform(platform, 'node_modules', 'nodegit', 'build', 'Release');
  log.debug('Replacing nodegit binaries from ', extractDir);
  await deleteAll([destination], log);
  await scanCopy({
    source: extractDir,
    destination: destination,
    time: new Date(),
  });
}

async function cleanNodeGitPatchDir(config, log) {
  await deleteAll([config.resolveFromRepo('.nodegit_binaries')], log);
}

export const PatchNativeModulesTask = {
  description: 'Patching platform-specific native modules directories',
  async run(config, log, build) {
    await cleanNodeGitPatchDir(config, log);
    await Promise.all(config.getTargetPlatforms().map(async platform => {
      await patchNodeGit(config, log, build, platform);
    }));
  }
};
