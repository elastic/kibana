/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { install, paths } from '@kbn/screenshotting-plugin/server/utils';
import type { Task } from '../lib';

export const InstallChromium: Task = {
  description: 'Installing Chromium',

  async run(config, log, build) {
    const preInstalledPackages = paths.packages.filter((p) => p.isPreInstalled);

    for (const platform of config.getNodePlatforms()) {
      const pkg = paths.find(platform.getName(), platform.getArchitecture(), preInstalledPackages);
      const target = `${
        platform.getVariant() || 'default'
      }-${platform.getName()}-${platform.getArchitecture()}`;

      if (!pkg || platform.isServerless()) {
        log.info(`Skipping Chromium install for ${target}`);

        // Unbundled chromium packages (for Darwin): Chromium is downloaded at
        // server startup, rather than being pre-installed
        continue;
      }

      log.info(`Installing Chromium for ${target}`);

      const logger = {
        get: log.withType.bind(log),
        debug: log.debug.bind(log),
        info: log.info.bind(log),
        warn: log.warning.bind(log),
        trace: log.verbose.bind(log),
        error: log.error.bind(log),
        fatal: log.error.bind(log),
        log: log.write.bind(log),
      };

      const path = build.resolvePathForPlatform(
        platform,
        'node_modules/@kbn/screenshotting-plugin/chromium'
      );
      await install(logger as unknown as Logger, pkg, path);
    }
  },
};
