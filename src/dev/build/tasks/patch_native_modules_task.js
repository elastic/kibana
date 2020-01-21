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
import { deleteAll, download, untar } from '../lib';

const BASE_URL = `https://storage.googleapis.com/native-modules`;
const DOWNLOAD_DIRECTORY = '.native_modules';

const packages = [
  {
    name: 're2',
    version: '1.10.5',
    destinationPath: 'node_modules/re2/build/Release/',
    shas: {
      darwin: '0640af2971828597cdca590e3f022071d6f11d5d4f01f16d80783ff840019f33',
      linux: '12aa5e5547469872af342194dfaf3ad2ed4967b447a16bd954eff40ad9bc0bfa',
      windows: '96d8194f1bbb2105b71330b671b202b2b46e3fa09141bd600d9c284202eda7b4',
    },
  },
];

async function patchModule(config, log, build, platform, pkg) {
  const platformName = platform.getName();
  const archiveName = `${pkg.version}-${platformName}.tar.gz`;
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
