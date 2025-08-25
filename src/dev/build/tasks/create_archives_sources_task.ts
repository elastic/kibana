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
import { KIBANA_SOLUTIONS } from '@kbn/projects-solutions-groups';
import type { KibanaSolution } from '@kbn/projects-solutions-groups';
import { resolve, join } from 'path';
import { scanCopy, deleteAll, copyAll } from '../lib';
import type { Task, Platform } from '../lib';
import { getNodeDownloadInfo } from './nodejs';

export const CreateArchivesSources: Task = {
  description: 'Creating platform-specific archive source directories',
  async run(config, log, build) {
    async function removeSolutions(solutionsToRemove: KibanaSolution[], platform: Platform) {
      const solutionPluginNames: string[] = [];

      for (const solution of solutionsToRemove) {
        const solutionPlugins = config.getPrivateSolutionPackagesFromRepo(solution);
        solutionPluginNames.push(...solutionPlugins.map((p) => p.name));
      }
      if (!solutionPluginNames.length) return;

      log.debug(
        `Removing ${solutionPluginNames.length} unused plugins from [${platform.toString()}]`
      );
      await deleteAll(
        solutionPluginNames.map((name) =>
          build.resolvePathForPlatform(platform, join('node_modules', name))
        ),
        log
      );

      removePackagesFromPackageMap(
        solutionPluginNames,
        build.resolvePathForPlatform(platform, 'node_modules/@kbn/repo-packages/package-map.json')
      );
    }

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
          // Remove canvas shareable runtime, and chromium assets
          await deleteAll(
            [
              'x-pack/platform/plugins/private/canvas/shareable_runtime/build',
              'node_modules/@kbn/screenshotting-plugin/server/assets',
            ].map((path) => build.resolvePathForPlatform(platform, path)),
            log
          );

          // Copy solution config.yml
          const CHAT_CONFIGS = ['serverless.chat.yml'];
          const SEARCH_CONFIGS = ['serverless.es.yml'];
          const OBSERVABILITY_CONFIGS = [
            'serverless.oblt.yml',
            'serverless.oblt.{logs_essentials,complete}.yml',
          ];
          const SECURITY_CONFIGS = [
            'serverless.security.yml',
            'serverless.security.{search_ai_lake,essentials,complete}.yml',
          ];
          const configFiles = ['serverless.yml'];
          switch (platform.getSolution()) {
            case 'chat':
              configFiles.push(...CHAT_CONFIGS);
              break;
            case 'search':
              configFiles.push(...SEARCH_CONFIGS);
              break;
            case 'observability':
              configFiles.push(...OBSERVABILITY_CONFIGS);
              break;
            case 'security':
              configFiles.push(...SECURITY_CONFIGS);
              break;
            default:
              configFiles.push(
                ...CHAT_CONFIGS,
                ...SEARCH_CONFIGS,
                ...OBSERVABILITY_CONFIGS,
                ...SECURITY_CONFIGS
              );
              break;
          }
          await copyAll(
            resolve(REPO_ROOT, 'config'),
            build.resolvePathForPlatform(platform, 'config'),
            {
              select: configFiles,
            }
          );

          // Remove non-target solutions
          const targetSolution = platform.getSolution();
          if (targetSolution && KIBANA_SOLUTIONS.includes(targetSolution)) {
            const solutionsToRemove = KIBANA_SOLUTIONS.filter((s) => s !== targetSolution);
            await removeSolutions(solutionsToRemove, platform);
          }
        } else if (config.isRelease) {
          // For stateful release builds, remove the chat solution.
          // Snapshot builds support all solutions to faciliate functional testing
          await removeSolutions(['chat'], platform);
        }
      })
    );
  },
};
