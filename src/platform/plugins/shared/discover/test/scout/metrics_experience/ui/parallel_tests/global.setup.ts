/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';
import {
  createMetricsTestIndexIfNeeded,
  DIMENSIONS_WIPE_CONFIG,
  PARTIAL_DIM_FULL_CONFIG,
  PARTIAL_DIM_ONLY_CONFIG,
} from '../fixtures';

globalSetupHook('Setup metrics experience tests data', async ({ esClient, apiServices, log }) => {
  log.debug('[setup:metrics] feature flag overrides');
  await apiServices.core.settings({
    'feature_flags.overrides': {
      'discover.metricsExperienceEditGridSettingsEnabled': true,
      'discover.metricsExperienceSortEnabled': true,
    },
  });

  log.debug('[setup:metrics] creating metrics test index (only if it does not exist)...');
  const created = await createMetricsTestIndexIfNeeded(esClient);
  log.debug(
    created
      ? '[setup:metrics] metrics test index created successfully'
      : '[setup:metrics] metrics test index already exists, skipping'
  );

  log.debug('[setup:metrics] creating companion metrics test index (only if it does not exist)...');
  const createdOther = await createMetricsTestIndexIfNeeded(esClient, DIMENSIONS_WIPE_CONFIG);
  log.debug(
    createdOther
      ? '[setup:metrics] companion metrics test index created successfully'
      : '[setup:metrics] companion metrics test index already exists, skipping'
  );

  log.debug(
    '[setup:metrics] creating partial-dimension metrics test indices (only if they do not exist)...'
  );
  await createMetricsTestIndexIfNeeded(esClient, PARTIAL_DIM_FULL_CONFIG);
  await createMetricsTestIndexIfNeeded(esClient, PARTIAL_DIM_ONLY_CONFIG);
  log.debug('[setup:metrics] partial-dimension metrics test indices ready');
});
