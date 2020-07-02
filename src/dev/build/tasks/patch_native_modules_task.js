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
import fs from 'fs';
import path from 'path';
import util from 'util';
import { deleteAll, download, gunzip, untar } from '../lib';

const DOWNLOAD_DIRECTORY = '.native_modules';

const packages = [
  {
    name: 're2',
    version: '1.14.0',
    destinationPath: 'node_modules/re2/build/Release/re2.node',
    extractMethod: 'gunzip',
    archives: {
      darwin: {
        url: 'https://github.com/uhop/node-re2/releases/download/1.14.0/darwin-x64-64.gz',
        sha256: '54c8386cb7cd53895cf379522114bfe82378e300e127e58d392ddd40a77e396f',
      },
      linux: {
        url: 'https://github.com/uhop/node-re2/releases/download/1.14.0/linux-x64-64.gz',
        sha256: 'f54f059035e71a7ccb3fa201080e260c41d228d13a8247974b4bb157691b6757',
      },
      windows: {
        url: 'https://github.com/uhop/node-re2/releases/download/1.14.0/win32-x64-64.gz',
        sha256: 'de708446a8b802f4634c2cfef097c2625a2811fdcd8133dfd7b7c485f966caa9',
      },
    },
  },
];

async function getInstalledVersion(config, packageName) {
  const packageJSONPath = config.resolveFromRepo(
    path.join('node_modules', packageName, 'package.json')
  );
  const buffer = await util.promisify(fs.readFile)(packageJSONPath);
  const packageJSON = JSON.parse(buffer);
  return packageJSON.version;
}

async function patchModule(config, log, build, platform, pkg) {
  const installedVersion = await getInstalledVersion(config, pkg.name);
  if (installedVersion !== pkg.version) {
    throw new Error(
      `Can't patch ${pkg.name}'s native module, we were expecting version ${pkg.version} and found ${installedVersion}`
    );
  }
  const platformName = platform.getName();
  const archive = pkg.archives[platformName];
  const archiveName = path.basename(archive.url);
  const downloadPath = config.resolveFromRepo(DOWNLOAD_DIRECTORY, pkg.name, archiveName);
  const extractPath = build.resolvePathForPlatform(platform, pkg.destinationPath);
  log.debug(`Patching ${pkg.name} binaries from ${archive.url} to ${extractPath}`);

  await deleteAll([extractPath], log);
  await download({
    log,
    url: archive.url,
    destination: downloadPath,
    sha256: archive.sha256,
    retries: 3,
  });
  switch (pkg.extractMethod) {
    case 'gunzip':
      await gunzip(downloadPath, extractPath);
      break;
    case 'untar':
      await untar(downloadPath, extractPath);
      break;
    default:
      throw new Error(`Extract method of ${pkg.extractMethod} is not supported`);
  }
}

export const PatchNativeModulesTask = {
  description: 'Patching platform-specific native modules',
  async run(config, log, build) {
    for (const pkg of packages) {
      await Promise.all(
        config.getTargetPlatforms().map(async (platform) => {
          await patchModule(config, log, build, platform, pkg);
        })
      );
    }
  },
};
