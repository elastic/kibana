/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalTeardownHook } from '@kbn/scout';
import { SECURITY_INDICES } from '../fixtures/constants';

globalTeardownHook('Teardown security experience tests data', async ({ esClient, log }) => {
  log.debug('[teardown:security] deleting synthetic security test indices');
  for (const index of Object.values(SECURITY_INDICES)) {
    await esClient.indices.delete({ index, ignore_unavailable: true });
  }
});
