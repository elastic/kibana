/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';
import { cloudLinksServerArgs } from '../shared';

/**
 * Scout server configuration for Cloud Links integration tests.
 *
 * Extends the default stateful config with cloud-specific settings required
 * to render cloud UI links (nav, user menu, connection details) and enable
 * the trial product intercept feature tested by trial_product_intercepts.spec.ts.
 *
 * Start servers:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet cloud_links
 *
 * Run tests:
 *   node scripts/scout.js run-tests --arch stateful --domain classic \
 *     --config x-pack/platform/plugins/private/cloud_integrations/cloud_links/test/scout_cloud_links/ui/playwright.config.ts
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,

  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, ...cloudLinksServerArgs],
  },
};
