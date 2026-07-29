/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalTeardownHook } from '@kbn/scout';

globalTeardownHook('Teardown traces experience tests data', async ({ esClient, log }) => {
  await esClient.indices.delete({ index: 'traces-test.otel-default', ignore_unavailable: true });
  log.debug('[teardown:traces] Deleted traces-test.otel-default index');
});
