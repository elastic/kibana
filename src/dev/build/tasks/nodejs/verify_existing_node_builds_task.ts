/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFileHash, GlobalTask } from '../../lib';
import { getNodeDownloadInfo } from './node_download_info';
import { getNodeShasums } from './node_shasums';

export const VerifyExistingNodeBuilds: GlobalTask = {
  global: true,
  description: 'Verifying previously downloaded node.js build for all platforms',
  async run(config, log) {
    const builds: Array<{ downloadPath: string; shaChecksum: string }> = [];
    for (const platform of config.getNodePlatforms()) {
      for (const nodeInfo of getNodeDownloadInfo(config, platform)) {
        const shasums = await getNodeShasums(log, config.getNodeVersion(), nodeInfo.variant);
        if (!builds.some((build) => build.downloadPath === nodeInfo.downloadName)) {
          builds.push({
            downloadPath: nodeInfo.downloadPath,
            shaChecksum: shasums[nodeInfo.downloadName],
          });
        }
      }
    }

    await Promise.all(
      builds.map(async ({ shaChecksum, downloadPath }) => {
        const sha256 = await getFileHash(downloadPath, 'sha256');
        if (sha256 !== shaChecksum) {
          throw new Error(`Download at ${downloadPath} does not match expected checksum ${sha256}`);
        }

        log.success(`Download at ${downloadPath} matches checksum`);
      })
    );
  },
};
