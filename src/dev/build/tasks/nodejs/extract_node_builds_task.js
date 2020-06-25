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

import { dirname, resolve } from 'path';
import fs from 'fs';
import { promisify } from 'util';

import { untar, mkdirp } from '../../lib';
import { getNodeDownloadInfo } from './node_download_info';

const statAsync = promisify(fs.stat);
const copyFileAsync = promisify(fs.copyFile);

export const ExtractNodeBuildsTask = {
  global: true,
  description: 'Extracting node.js builds for all platforms',
  async run(config) {
    await Promise.all(
      config.getNodePlatforms().map(async (platform) => {
        const { downloadPath, extractDir } = getNodeDownloadInfo(config, platform);
        // windows executable is not extractable, it's just an .exe file
        if (platform.isWindows()) {
          const destination = resolve(extractDir, 'node.exe');
          return this.copyWindows(downloadPath, destination);
        }

        // all other downloads are tarballs
        return untar(downloadPath, extractDir, { strip: 1 });
      })
    );
  },
  async copyWindows(source, destination) {
    // ensure source exists before creating destination directory
    await statAsync(source);
    await mkdirp(dirname(destination));
    // for performance reasons, do a copy-on-write by using the fs.constants.COPYFILE_FICLONE flag
    return await copyFileAsync(source, destination, fs.constants.COPYFILE_FICLONE);
  },
};
