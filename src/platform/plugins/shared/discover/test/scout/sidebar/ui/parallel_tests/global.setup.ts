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
  INDEX_PATTERN_WITHOUT_TIMEFIELD_ES_ARCHIVE,
  LOGSTASH_ES_ARCHIVE,
  MANY_FIELDS_ES_ARCHIVE,
} from '../fixtures';

globalSetupHook('Setup Discover sidebar tests data', async ({ esArchiver, log }) => {
  log.debug('[setup:logstash] loading logstash_functional ES data (only if it does not exist)...');
  await esArchiver.loadIfNeeded(LOGSTASH_ES_ARCHIVE);
  log.debug('[setup:logstash] logstash_functional ES data ready');

  log.debug(
    '[setup:index_pattern_without_timefield] loading index_pattern_without_timefield ES data (only if it does not exist)...'
  );
  await esArchiver.loadIfNeeded(INDEX_PATTERN_WITHOUT_TIMEFIELD_ES_ARCHIVE);
  log.debug(
    '[setup:index_pattern_without_timefield] index_pattern_without_timefield ES data ready'
  );

  log.debug('[setup:many_fields] loading many_fields ES data (only if it does not exist)...');
  await esArchiver.loadIfNeeded(MANY_FIELDS_ES_ARCHIVE);
  log.debug('[setup:many_fields] many_fields ES data ready');
});
