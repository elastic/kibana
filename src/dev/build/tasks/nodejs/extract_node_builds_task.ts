/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import { untar, GlobalTask, copy } from '../../lib';
import { getNodeDownloadInfo } from './node_download_info';

export const ExtractNodeBuilds: GlobalTask = {
  global: true,
  description: 'Extracting node.js builds for all platforms',
  async run(config) {
    await Promise.all(
      config.getNodePlatforms().map(async (platform) => {
        await Promise.all(
          getNodeDownloadInfo(config, platform).map((nodeInfo) => {
            if (Fs.existsSync(nodeInfo.extractDir)) return;
            if (platform.isWindows()) {
              // windows executable is not extractable, it's just an .exe file
              return copy(nodeInfo.downloadPath, Path.resolve(nodeInfo.extractDir, 'node.exe'), {
                clone: true,
              });
            } else {
              return untar(nodeInfo.downloadPath, nodeInfo.extractDir, { strip: 1 });
            }
          })
        );
      })
    );
  },
};
