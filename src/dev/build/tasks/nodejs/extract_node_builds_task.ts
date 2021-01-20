/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Path from 'path';

import { untar, GlobalTask, copy } from '../../lib';
import { getNodeDownloadInfo } from './node_download_info';

export const ExtractNodeBuilds: GlobalTask = {
  global: true,
  description: 'Extracting node.js builds for all platforms',
  async run(config) {
    await Promise.all(
      config.getNodePlatforms().map(async (platform) => {
        const { downloadPath, extractDir } = getNodeDownloadInfo(config, platform);
        if (platform.isWindows()) {
          // windows executable is not extractable, it's just an .exe file
          await copy(downloadPath, Path.resolve(extractDir, 'node.exe'), {
            clone: true,
          });
        } else {
          await untar(downloadPath, extractDir, { strip: 1 });
        }
      })
    );
  },
};
