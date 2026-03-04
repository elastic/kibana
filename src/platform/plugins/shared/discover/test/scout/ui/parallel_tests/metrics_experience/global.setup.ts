/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';
import { createMetricsTestIndexIfNeeded } from '../../fixtures/metrics_experience';

globalSetupHook('Ingest metrics data to Elasticsearch', async ({ esClient, log }) => {
  log.debug('[setup] creating metrics test index (only if it does not exist)...');
  const created = await createMetricsTestIndexIfNeeded(esClient);
  log.debug(
    created
      ? '[setup] metrics test index created successfully'
      : '[setup] metrics test index already exists, skipping'
  );
});
