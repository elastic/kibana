/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { download, GlobalTask } from '../../lib';
import { getNodeShasums } from './node_shasums';
import { getNodeDownloadInfo } from './node_download_info';

export const DownloadNodeBuilds: GlobalTask = {
  global: true,
  description: 'Downloading node.js builds for all platforms',
  async run(config, log) {
    const shasums = await getNodeShasums(log, config.getNodeVersion());
    await Promise.all(
      config.getNodePlatforms().map(async (platform) => {
        const { url, downloadPath, downloadName } = getNodeDownloadInfo(config, platform);
        await download({
          log,
          url,
          sha256: shasums[downloadName],
          destination: downloadPath,
          retries: 3,
        });
      })
    );
  },
};
