/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getFileHash, GlobalTask } from '../../lib';
import { getNodeDownloadInfo } from './node_download_info';
import { getNodeShasums } from './node_shasums';

export const VerifyExistingNodeBuilds: GlobalTask = {
  global: true,
  description: 'Verifying previously downloaded node.js build for all platforms',
  async run(config, log) {
    const shasums = await getNodeShasums(log, config.getNodeVersion());

    await Promise.all(
      config.getNodePlatforms().map(async (platform) => {
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
