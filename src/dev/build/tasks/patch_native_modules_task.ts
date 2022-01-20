/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';

import { ToolingLog } from '@kbn/dev-utils';

import {
  deleteAll,
  downloadToDisk,
  gunzip,
  untar,
  Task,
  Config,
  Build,
  Platform,
  read,
} from '../lib';

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
    version: '1.16.0',
    destinationPath: 'node_modules/re2/build/Release/re2.node',
    extractMethod: 'gunzip',
    archives: {
      'darwin-x64': {
        url: 'https://github.com/uhop/node-re2/releases/download/1.16.0/darwin-x64-93.gz',
        sha256: 'a267c6202d86d08170eb4a833acf81d83660ce33e8981fcd5b7f6e0310961d56',
      },
      'linux-x64': {
        url: 'https://github.com/uhop/node-re2/releases/download/1.16.0/linux-x64-93.gz',
        sha256: 'e0ca5d6527fe7ec0fe98b6960c47b66a5bb2823c3bebb3bf4ed4d58eed3d23c5',
      },

      // ARM build is currently done manually as Github Actions used in upstream project
      // do not natively support an ARM target.

      // From a AWS Graviton instance:
      // * checkout the node-re2 project,
      // * install Node using the same minor used by Kibana
      // * git submodule update --init --recursive to download re2
      // * npm install, which will also create a build
      // * gzip -c build/Release/re2.node > linux-arm64-83.gz
      // * upload to kibana-ci-proxy-cache bucket
      'linux-arm64': {
        url: 'https://storage.googleapis.com/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.16.0/linux-arm64-93.gz',
        sha256: '7a786e0b75985e5aafdefa9af55cad8e85e69a3326f16d8c63d21d6b5b3bff1b',
      },
      'darwin-arm64': {
        url: 'https://storage.googleapis.com/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.16.0/darwin-arm64-93.gz',
        sha256: '28b540cdddf13578f1bd28a03e29ffdc26a7f00ec859c369987b8d51ec6357c8',
      },
      'win32-x64': {
        url: 'https://github.com/uhop/node-re2/releases/download/1.16.0/win32-x64-93.gz',
        sha256: '37245ceb59a086b5e7e9de8746a3cdf148c383be9ae2580f92baea90d0d39947',
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
  await downloadToDisk({
    log,
    url: archive.url,
    destination: downloadPath,
    shaChecksum: archive.sha256,
    shaAlgorithm: 'sha256',
    maxAttempts: 3,
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
