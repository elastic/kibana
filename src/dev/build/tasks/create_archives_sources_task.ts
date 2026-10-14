/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { resolve } from 'path';
import { scanCopy, deleteAll, copyAll } from '../lib';
import type { Task } from '../lib';
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
        await Promise.all(
          getNodeDownloadInfo(config, platform).map((nodeInfo) => {
            return scanCopy({
              source: nodeInfo.extractDir,
              destination: build.resolvePathForPlatform(platform, 'node', nodeInfo.variant),
            });
          })
        );

        log.debug('Node.js copied into', platform.getNodeArch(), 'specific build directory');

        if (platform.isServerless()) {
          // Remove chromium assets
          await deleteAll(
            ['node_modules/@kbn/screenshotting-plugin/server/assets'].map((path) =>
              build.resolvePathForPlatform(platform, path)
            ),
            log
          );

          // Copy all serverless config files into the generic serverless build.
          await copyAll(
            resolve(REPO_ROOT, 'config'),
            build.resolvePathForPlatform(platform, 'config'),
            {
              select: ['serverless*.yml'],
            }
          );
        }
      })
    );
  },
};
