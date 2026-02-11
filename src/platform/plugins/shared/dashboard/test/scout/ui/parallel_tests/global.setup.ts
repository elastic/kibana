/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook, tags } from '@kbn/scout';

// ES archives shared across all test suites
const ES_ARCHIVES = {
  LOGSTASH_FUNCTIONAL: 'src/platform/test/functional/fixtures/es_archiver/logstash_functional',
  DASHBOARD_DATA: 'src/platform/test/functional/fixtures/es_archiver/dashboard/current/data',
  SHAKESPEARE: 'x-pack/platform/test/fixtures/es_archives/getting_started/shakespeare',
};

globalSetupHook(
  'Ingest ES data needed for Dashboard tests',
  { tag: tags.DEPLOYMENT_AGNOSTIC },
  async ({ esArchiver, log }) => {
    log.info('[setup] Loading ES archives for Dashboard Scout tests...');

    await esArchiver.loadIfNeeded(ES_ARCHIVES.LOGSTASH_FUNCTIONAL);
    await esArchiver.loadIfNeeded(ES_ARCHIVES.DASHBOARD_DATA);
    await esArchiver.loadIfNeeded(ES_ARCHIVES.SHAKESPEARE);

    log.info('[setup] Dashboard ES archives loaded successfully');
  }
);
