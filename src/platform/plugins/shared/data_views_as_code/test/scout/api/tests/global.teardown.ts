/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalTeardownHook } from '@kbn/scout';
import { DATA_VIEWS_AS_CODE_ENABLED_FEATURE_FLAG } from '../fixtures/constants';

globalTeardownHook(
  'Reset the data views as code API feature flag',
  async ({ apiServices, log }) => {
    log.debug('[teardown] Resetting the data views as code API feature flag');
    await apiServices.core.settings({
      'feature_flags.overrides': {
        [DATA_VIEWS_AS_CODE_ENABLED_FEATURE_FLAG]: null,
      },
    });
  }
);
