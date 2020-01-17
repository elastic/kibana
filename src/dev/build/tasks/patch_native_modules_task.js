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

const shas = {
  darwin: '0808d599921d458ea8489bc53e98f0c1fca09b8020d871a1b2530162a9720644',
  linux: '925830c881748396c83b84dc9ed479d0ab01b8440cf186092cf0005422c373c8',
  windows: '96d8194f1bbb2105b71330b671b202b2b46e3fa09141bd600d9c284202eda7b4',
};

async function patchRE2(config, log, build, platform) {
  const platformName = platform.getName();
  const moduleName = 're2';
  const version = '1.10.5';
  const archiveName = `${version}-${platformName}.tar.gz`;
  const downloadUrl = `${BASE_URL}/${moduleName}/${archiveName}`;
  const downloadPath = config.resolveFromRepo('.native_modules', archiveName);
  const extractedPath = build.resolvePathForPlatform(platform, 'node_modules/re2/build/Release/');
  log.debug('Patching re2 binaries from ' + downloadUrl + ' to ' + extractedPath);

  await deleteAll([extractedPath], log);
  await download({
    log,
    url: downloadUrl,
    destination: downloadPath,
    sha256: shas[platformName],
    retries: 3,
  });
  await untar(downloadPath, extractedPath);
}

export const PatchNativeModulesTask = {
  description: 'Patching platform-specific native modules',
  async run(config, log, build) {
    await Promise.all(
      config.getTargetPlatforms().map(async platform => {
        await patchRE2(config, log, build, platform);
      })
    );
  },
};
