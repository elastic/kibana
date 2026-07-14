/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';
import { DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_KEY } from '../fixtures/constants';

globalSetupHook('Enable the Discover sessions API', async ({ apiServices, log }) => {
  log.debug('[setup] Enabling the Discover sessions API');
  await apiServices.core.settings({
    'feature_flags.overrides': {
      [DISCOVER_SESSIONS_API_ENABLED_FEATURE_FLAG_KEY]: true,
    },
  });
});
