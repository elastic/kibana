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
    // Tip: use `scripts/download_re2.sh` to download binary artifacts from GitHub
    name: 're2',
    version: '1.20.1',
    destinationPath: 'node_modules/re2/build/Release/re2.node',
    extractMethod: 'gunzip',
    archives: {
      'linux-x64': {
        url: 'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.20.1/linux-x64-115.gz',
        sha256: '7a4821ef7e9ddbafe5bba6beb54b100c233242f0dbf5a7268f55beea5f845f97',
      },
      // Linux ARM builds are currently done manually as Github Actions used in upstream project
      // do not natively support an Linux ARM target.
      //
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
        url: 'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.20.1/linux-arm64-115.gz',
        sha256: '8d753d6ac15d95d6d236dce2f986f4a6b2f9945ba0d927ab972eb82da68d14b1',
      },
      'darwin-x64': {
        url: 'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.20.1/darwin-x64-115.gz',
        sha256: '91823077c510c6da9c428038bfd210846373bcd0ab6851f7408add67864785a9',
      },
      'darwin-arm64': {
        url: 'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.20.1/darwin-arm64-115.gz',
        sha256: '935e2a5590e93e6f52f41d40ae4115fbd2f130a4d61afb0a6549ed17adb1dd84',
      },
      'win32-x64': {
        url: 'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2/uhop/node-re2/releases/download/1.20.1/win32-x64-115.gz',
        sha256: '120c2663bcab4803f8405d9aa2cb97fa181d90b4ff176827cc7295667aa2e9c2',
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
