/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import { extract } from '@kbn/dev-utils';
import type { GlobalTask } from '../../lib';
import { copy } from '../../lib';
import { getNodeDownloadInfo } from './node_download_info';

export const ExtractNodeBuilds: GlobalTask = {
  global: true,
  description: 'Extracting node.js builds for all platforms',
  async run(config) {
    const nodeBuilds = new Map(
      config
        .getNodePlatforms()
        .flatMap((platform) => getNodeDownloadInfo(config, platform))
        .map((nodeInfo) => [nodeInfo.extractDir, nodeInfo])
    );

    await Promise.all(
      Array.from(nodeBuilds.values(), (nodeInfo) => {
        if (Fs.existsSync(nodeInfo.extractDir)) return;
        if (nodeInfo.downloadName.endsWith('node.exe')) {
          // windows executable is not extractable, it's just an .exe file
          return copy(nodeInfo.downloadPath, Path.resolve(nodeInfo.extractDir, 'node.exe'), {
            clone: true,
          });
        }

        return extract({
          archivePath: nodeInfo.downloadPath,
          targetDir: nodeInfo.extractDir,
          stripComponents: 1,
        });
      })
    );
  },
};
