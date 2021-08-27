/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { first } from 'rxjs/operators';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { installBrowser } from '../../../../x-pack/plugins/reporting/server/browsers/install';

export const InstallChromium = {
  description: 'Installing Chromium',

  async run(config, log, build) {
    for (const platform of config.getNodePlatforms()) {
      log.info(`Installing Chromium for ${platform.getName()}-${platform.getArchitecture()}`);

      const { binaryPath$ } = installBrowser(
        log,
        build.resolvePathForPlatform(platform, 'x-pack/plugins/reporting/chromium'),
        platform.getName(),
        platform.getArchitecture()
      );
      await binaryPath$.pipe(first()).toPromise();
    }
  },
};
