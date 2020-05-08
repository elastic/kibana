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
import { deleteAll, download, untar } from '../lib';

const BASE_URL = `https://storage.googleapis.com/native-modules`;
const DOWNLOAD_DIRECTORY = '.native_modules';

const packages = [
  {
    name: 're2',
    version: '1.10.5',
    destinationPath: 'node_modules/re2/build/Release/',
    shas: {
      darwin: '0deba2bb0e8c59f1cab1bcd3a30e30b82b1f3f49d8740a73f0e4de4ab0e44658',
      linux: '6006ff9fd22387de349aad14fa117ddde41665d02ad28a3b47e34bdd8ba48acf',
      windows: 'cd79658510357f3865cdceb60a80c80a642e90ae798fb31515cebed76eda8264',
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
  const archiveName = `${pkg.version}-${platformName}-node-v${process.versions.modules}.tar.gz`;
  const downloadUrl = `${BASE_URL}/${pkg.name}/${archiveName}`;
  const downloadPath = config.resolveFromRepo(DOWNLOAD_DIRECTORY, archiveName);
  const extractedPath = build.resolvePathForPlatform(platform, pkg.destinationPath);
  log.debug(`Patching ${pkg.name} binaries from ${downloadUrl} to ${extractedPath}`);

  await deleteAll([extractedPath], log);
  await download({
    log,
    url: downloadUrl,
    destination: downloadPath,
    sha256: pkg.shas[platformName],
    retries: 3,
  });
  await untar(downloadPath, extractedPath);
}

export const PatchNativeModulesTask = {
  description: 'Patching platform-specific native modules',
  async run(config, log, build) {
    for (const pkg of packages) {
      await Promise.all(
        config.getTargetPlatforms().map(async platform => {
          await patchModule(config, log, build, platform, pkg);
        })
      );
    }
  },
};
