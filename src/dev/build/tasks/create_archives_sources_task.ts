/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { REPO_ROOT } from '@kbn/repo-info';
import { removePackagesFromPackageMap } from '@kbn/repo-packages';
import { resolve, join } from 'path';
import { scanCopy, Task, deleteAll, copyAll } from '../lib';
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
          await deleteAll(
            [
              'x-pack/platform/plugins/private/canvas/shareable_runtime/build',
              'node_modules/@kbn/screenshotting-plugin/server/assets',
            ].map((path) => build.resolvePathForPlatform(platform, path)),
            log
          );
          await copyAll(
            resolve(REPO_ROOT, 'config'),
            build.resolvePathForPlatform(platform, 'config'),
            {
              select: [
                'serverless.yml',
                'serverless.{chat,es,oblt,security}.yml',
                'serverless.oblt.{logs_essentials,complete}.yml',
                'serverless.security.{search_ai_lake,essentials,complete}.yml',
              ],
            }
          );
          log.debug(`Adjustments made in serverless specific build directory`);

          // Remove chat solution from release artifacts
          // For now, snapshot builds support all solutions to faciliate functional testing
        } else if (config.isRelease) {
          const chatPlugins = config.getPrivateSolutionPackagesFromRepo('chat');
          const chatPluginNames = chatPlugins.map((p) => p.name);
          const chatPluginsPaths = chatPluginNames.map((name) =>
            build.resolvePathForPlatform(platform, join('node_modules', name))
          );
          log.debug('Removing plugins: ' + chatPluginNames.join(','));
          await deleteAll(chatPluginsPaths, log);

          removePackagesFromPackageMap(
            chatPluginNames,
            build.resolvePathForPlatform(
              platform,
              'node_modules/@kbn/repo-packages/package-map.json'
            )
          );
          log.debug(`Adjustments made in stateful specific build directory`);
        }
      })
    );
  },
};
