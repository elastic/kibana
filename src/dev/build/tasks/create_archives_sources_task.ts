/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { scanCopy, Task } from '../lib';
import { getNodeDownloadInfo } from './nodejs';

export const CreateArchivesSources: Task = {
  description: 'Creating platform-specific archive source directories',
  async run(config, log, build) {
    await Promise.all(
      config.getTargetPlatforms().map(async (platform) => {
        // copy all files from generic build source directory into platform-specific build directory
        await scanCopy({
          source: build.resolvePath(),
          destination: build.resolvePathForPlatform(platform),
        });

        log.debug(
          'Generic build source copied into',
          platform.getNodeArch(),
          'specific build directory'
        );

        // copy node.js install
        await scanCopy({
          source: getNodeDownloadInfo(config, platform).extractDir,
          destination: build.resolvePathForPlatform(platform, 'node'),
        });

        log.debug('Node.js copied into', platform.getNodeArch(), 'specific build directory');
      })
    );
  },
};
