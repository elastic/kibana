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
        url: 'https://github.com/uhop/node-re2/releases/download/1.15.4/darwin-x64-72.gz',
        sha256: '983106049bb86e21b7f823144b2b83e3f1408217401879b3cde0312c803512c9',
      },
      'linux-x64': {
        url: 'https://github.com/uhop/node-re2/releases/download/1.15.4/linux-x64-72.gz',
        sha256: '8b6692037f7b0df24dabc9c9b039038d1c3a3110f62121616b406c482169710a',
      },

      // ARM build is currently done manually as Github Actions used in upstream project
      // do not natively support an ARM target.

      // From a AWS Graviton instance:
      // * checkout the node-re2 project,
      // * install Node using the same minor used by Kibana
      // * npm install, which will also create a build
      // * gzip -c build/Release/re2.node > linux-arm64-72.gz
      // * upload to kibana-ci-proxy-cache bucket
      'linux-arm64': {
        url:
          'https://storage.googleapis.com/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.15.4/linux-arm64-72.gz',
        sha256: '5942353ec9cf46a39199818d474f7af137cfbb1bc5727047fe22f31f36602a7e',
      },
      'win32-x64': {
        url: 'https://github.com/uhop/node-re2/releases/download/1.15.4/win32-x64-72.gz',
        sha256: '0a6991e693577160c3e9a3f196bd2518368c52d920af331a1a183313e0175604',
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
