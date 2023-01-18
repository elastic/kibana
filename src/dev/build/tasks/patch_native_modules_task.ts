/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';

import { ToolingLog } from '@kbn/tooling-log';

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
    version: '1.17.7',
    destinationPath: 'node_modules/re2/build/Release/re2.node',
    extractMethod: 'gunzip',
    archives: {
      'darwin-x64': {
        url: 'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.17.7/darwin-x64-108.gz',
        sha256: '4ed378c5a7fe6134b717afe7642254aff1ed7a881cbcaa53a012ac3efab49f99',
      },
      'linux-x64': {
        url: 'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.17.7/linux-x64-108.gz',
        sha256: '197a617ca2965f220848561afed71ff6df653f6d79910cf38e866c84ab38a236',
      },

      // ARM builds are currently done manually as Github Actions used in upstream project
      // do not natively support an ARM target.

      // From an AWS Graviton instance running Ubuntu or a GCE T2A instance running Debian:
      // * install build-essential package: `sudo apt-get update` + `sudo apt install build-essential`
      // * install nvm and the node version used by the Kibana repository
      // * `npm install re2@1.17.7`
      // * re2 will build itself on install
      // * `cp node_modules/re2/build/Release/re2.node linux-arm64-$(node -e "console.log(process.versions.modules)")`
      // * `gzip linux-arm64-*`
      // * capture the sha256 with: `shasum -a 256 linux-arm64-*`
      // * upload the `linux-arm64-*.gz` artifact to the `yarn-prebuilt-artifacts` bucket in GCS using the correct version number
      'linux-arm64': {
        url: 'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.17.7/linux-arm64-108.gz',
        sha256: 'a690087a1a1fd9887aac1abdab68d1992600e218be10783da6d3381cca950c1a',
      },

      // A similar process is necessary for building on ARM macs:
      // * bootstrap and re2 will build itself on install
      // * `cp node_modules/re2/build/Release/re2.node darwin-arm64-$(node -e "console.log(process.versions.modules)")`
      // * `gzip darwin-arm64-*`
      // * capture the sha256 with: `shasum -a 256 darwin-arm64-*`
      // * upload the `darwin-arm64-*.gz` artifact to the `yarn-prebuilt-artifacts` bucket in GCS using the correct version number
      'darwin-arm64': {
        url: 'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.17.7/darwin-arm64-108.gz',
        sha256: '42afc32137ff5c5bebae5d68347a9786906748c2f28e06194d8950707f2ae90e',
      },

      'win32-x64': {
        url: 'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.17.7/win32-x64-108.gz',
        sha256: 'ff72fe02de652262659c8e17e44a932f3c873362233756b40d1a97538d05de92',
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
