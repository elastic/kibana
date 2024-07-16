/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { downloadToDisk, GlobalTask } from '../../lib';
import { getNodeShasums } from './node_shasums';
import { getNodeDownloadInfo } from './node_download_info';

export const DownloadNodeBuilds: GlobalTask = {
  global: true,
  description: 'Downloading node.js builds for all platforms',
  async run(config, log) {
    const downloads: Array<{ url: string; destination: string; shaChecksum: string }> = [];
    for (const platform of config.getNodePlatforms()) {
      for (const nodeInfo of getNodeDownloadInfo(config, platform)) {
        const shasums = await getNodeShasums(log, config.getNodeVersion(), nodeInfo.variant);

        if (!downloads.some((download) => download.url === nodeInfo.url)) {
          downloads.push({
            url: nodeInfo.url,
            destination: nodeInfo.downloadPath,
            shaChecksum: shasums[nodeInfo.downloadName],
          });
        }
      }
    }
    await Promise.all(
      downloads.map(function (download) {
        return downloadToDisk({
          ...download,
          log,
          shaAlgorithm: 'sha256',
          maxAttempts: 3,
        });
      })
    );
  },
};
