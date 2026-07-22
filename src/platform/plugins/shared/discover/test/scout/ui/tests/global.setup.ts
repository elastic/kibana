/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';
import { DATE_NESTED_ES_ARCHIVE } from '../fixtures/common/constants';

globalSetupHook('Setup Discover tests data', async ({ esArchiver, log }) => {
  log.debug('[setup:logstash] loading logstash_functional ES data (only if it does not exist)...');
  await esArchiver.loadIfNeeded(
    'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
  );
  log.debug('[setup:logstash] logstash_functional ES data ready');

  log.debug('[setup:date_nested] loading date_nested ES data (only if it does not exist)...');
  await esArchiver.loadIfNeeded(DATE_NESTED_ES_ARCHIVE);
  log.debug('[setup:date_nested] date_nested ES data ready');
});
