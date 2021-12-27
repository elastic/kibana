/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { install, paths } from '../../../../x-pack/plugins/screenshotting/server/utils';

export const InstallChromium = {
  description: 'Installing Chromium',

  async run(config, log, build) {
    for (const platform of config.getNodePlatforms()) {
      const packageInfo = paths.find(platform.getName(), platform.getArchitecture());
      if (!packageInfo || !packageInfo.bundled) {
        // Unbundled chromium packages (for Darwin): Chromium is downloaded at
        // server startup, rather than being pre-installed
        continue;
      }

      log.info(`Installing Chromium for ${paths.toString(packageInfo)}`);

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

      await install(
        logger,
        build.resolvePathForPlatform(platform, 'x-pack/plugins/screenshotting/chromium'),
        platform.getName(),
        platform.getArchitecture()
      );
    }
  },
};
