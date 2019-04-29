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

import { resolve } from 'path';

import { copy, untar } from '../../lib';
import { getNodeDownloadInfo } from './node_download_info';

export const ExtractNodeBuildsTask = {
  global: true,
  description: 'Extracting node.js builds for all platforms',
  async run(config) {
    await Promise.all(
      config.getNodePlatforms().map(async platform => {
        const { downloadPath, extractDir } = getNodeDownloadInfo(config, platform);

        // windows executable is not extractable, it's just a .exe file
        if (platform.isWindows()) {
          return await copy(downloadPath, resolve(extractDir, 'node.exe'));
        }

        // all other downloads are tarballs
        await untar(downloadPath, extractDir, {
          strip: 1
        });
      })
    );
  },
};
