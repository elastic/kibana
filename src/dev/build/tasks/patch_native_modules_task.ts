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

import path from 'path';

import { ToolingLog } from '@kbn/dev-utils';

import { deleteAll, download, gunzip, untar, Task, Config, Build, Platform, read } from '../lib';

const DOWNLOAD_DIRECTORY = '.native_modules';

interface Package {
  name: string;
  version: string;
  destinationPath: string;
  extractMethod: string;
  archives: Record<
    string,
    {
      url: string;
      sha256: string;
    }
  >;
}

const packages: Package[] = [
  {
    name: 're2',
    version: '1.15.4',
    destinationPath: 'node_modules/re2/build/Release/re2.node',
    extractMethod: 'gunzip',
    archives: {
      'darwin-x64': {
        url: 'https://github.com/uhop/node-re2/releases/download/1.15.4/darwin-x64-83.gz',
        sha256: 'b45cd8296fd6eb2a091399c20111af43093ba30c99ed9e5d969278f5ff69ba8f',
      },
      'linux-x64': {
        url: 'https://github.com/uhop/node-re2/releases/download/1.15.4/linux-x64-83.gz',
        sha256: '1bbc3f90f0ba105772b37c04e3a718f69544b4df01dda00435c2b8e50b2ad0d9',
      },

      // ARM build is currently done manually as Github Actions used in upstream project
      // do not natively support an ARM target.

      // From a AWS Graviton instance:
      // * checkout the node-re2 project,
      // * install Node using the same minor used by Kibana
      // * npm install, which will also create a build
      // * gzip -c build/Release/re2.node > linux-arm64-83.gz
      // * upload to kibana-ci-proxy-cache bucket
      'linux-arm64': {
        url:
          'https://storage.googleapis.com/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.15.4/linux-arm64-83.gz',
        sha256: '4eb524ca9a79dea9c07342e487fbe91591166fdbc022ae987104840df948a4e9',
      },
      'win32-x64': {
        url: 'https://github.com/uhop/node-re2/releases/download/1.15.4/win32-x64-83.gz',
        sha256: 'efe939d3cda1d64ee3ee3e60a20613b95166d55632e702c670763ea7e69fca06',
      },
    },
  },
];

async function getInstalledVersion(config: Config, packageName: string) {
  const packageJSONPath = config.resolveFromRepo(
    path.join('node_modules', packageName, 'package.json')
  );
  const json = await read(packageJSONPath);
  const packageJSON = JSON.parse(json);
  return packageJSON.version;
}

async function patchModule(
  config: Config,
  log: ToolingLog,
  build: Build,
  platform: Platform,
  pkg: Package
) {
  const installedVersion = await getInstalledVersion(config, pkg.name);
  if (installedVersion !== pkg.version) {
    throw new Error(
      `Can't patch ${pkg.name}'s native module, we were expecting version ${pkg.version} and found ${installedVersion}`
    );
  }
  const platformName = platform.getNodeArch();
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

export const PatchNativeModules: Task = {
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
