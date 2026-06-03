/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';

globalSetupHook('Setup Discover sequential tests data', async ({ esArchiver, log }) => {
  log.debug(
    '[setup:discover-sequential] loading logstash_functional ES data (only if it does not exist)...'
  );
  await esArchiver.loadIfNeeded(
    'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
  );
  log.debug('[setup:discover-sequential] logstash_functional ES data ready');
});
