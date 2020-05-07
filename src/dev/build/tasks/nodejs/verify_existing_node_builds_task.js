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

import { getFileHash } from '../../lib';
import { getNodeDownloadInfo } from './node_download_info';
import { getNodeShasums } from './node_shasums';

export const VerifyExistingNodeBuildsTask = {
  global: true,
  description: 'Verifying previously downloaded node.js build for all platforms',
  async run(config, log) {
    const shasums = await getNodeShasums(config.getNodeVersion());

    await Promise.all(
      config.getNodePlatforms().map(async platform => {
        const { downloadPath, downloadName } = getNodeDownloadInfo(config, platform);

        const sha256 = await getFileHash(downloadPath, 'sha256');
        if (sha256 !== shasums[downloadName]) {
          throw new Error(`Download at ${downloadPath} does not match expected checksum ${sha256}`);
        }

        log.success(`Download for ${platform.getNodeArch()} matches checksum`);
      })
    );
  },
};
