/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFips } from 'crypto';
import { set } from '@kbn/safer-lodash-set';
import { setLazyConfigSchemaDisabled } from '@kbn/config-schema';
import type { Root } from '@kbn/core-root-server-internal';
import { createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';
import { PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH } from '@kbn/core-plugins-server-internal/src/constants';

if (getFips() === 0) {
  describe('eager config-schema mode', () => {
    let root: Root | undefined;

    afterAll(async () => {
      setLazyConfigSchemaDisabled(false);
      await root?.shutdown();
    });

    // Lazy schemas defer Joi's argument checks to first use; building them eagerly here makes an
    // invalid definition on any plugin's setup path fail the boot instead of a later request.
    it('sets up all plugins with every Joi schema built at definition time', async () => {
      setLazyConfigSchemaDisabled(true);

      const settings = {
        logging: { loggers: [{ name: 'root', level: 'error', appenders: ['console'] }] },
        server: { restrictInternalApis: false },
      };
      set(settings, PLUGIN_SYSTEM_ENABLE_ALL_PLUGINS_CONFIG_PATH, true);

      root = createRootWithCorePlugins(settings, {
        basePath: false,
        cache: false,
        dev: true,
        disableOptimizer: true,
        silent: false,
        dist: false,
        oss: false,
        runExamples: false,
        watch: false,
      });

      await root.preboot();
      await expect(root.setup()).resolves.toBeDefined();
    });
  });
}
