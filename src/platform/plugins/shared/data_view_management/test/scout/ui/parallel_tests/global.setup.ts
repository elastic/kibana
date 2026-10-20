/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook, tags } from '@kbn/scout';

const ES_ARCHIVES = {
  LOGSTASH_FUNCTIONAL: 'src/platform/test/functional/fixtures/es_archiver/logstash_functional',
  MAKELOGS: 'src/platform/test/functional/fixtures/es_archiver/makelogs',
  NO_TIMEFIELD: 'src/platform/test/functional/fixtures/es_archiver/index_pattern_without_timefield',
};

globalSetupHook(
  'Load ES data for data view management Scout tests',
  { tag: tags.deploymentAgnostic },
  async ({ esArchiver, log }) => {
    log.info('[setup] Loading ES archives for data view management tests...');
    await esArchiver.loadIfNeeded(ES_ARCHIVES.LOGSTASH_FUNCTIONAL);
    await esArchiver.loadIfNeeded(ES_ARCHIVES.MAKELOGS);
    await esArchiver.loadIfNeeded(ES_ARCHIVES.NO_TIMEFIELD);
    log.info('[setup] ES archives loaded successfully');
  }
);
