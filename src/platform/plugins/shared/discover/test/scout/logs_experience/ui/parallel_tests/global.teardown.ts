/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalTeardownHook } from '@kbn/scout';
import { deleteLogsExperienceData } from '../fixtures';

globalTeardownHook('Teardown logs experience tests data', async ({ esClient, log }) => {
  // Warn rather than throw: a failed teardown shouldn't fail an otherwise green run, and the
  // next run deletes the same resources before seeding.
  await deleteLogsExperienceData(esClient)
    .then(() => log.debug('[teardown:logs] Deleted the synthetic logs and non-logs data'))
    .catch((err: Error) =>
      log.warning(`[teardown:logs] Failed to delete the synthetic data: ${err.message}`)
    );
});
