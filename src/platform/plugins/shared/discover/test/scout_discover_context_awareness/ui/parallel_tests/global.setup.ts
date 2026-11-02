/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook, tags } from '@kbn/scout';
import { LOGSTASH_ES_ARCHIVE } from '../../../scout/common/ui/fixtures/constants';
import { CONTEXT_AWARENESS_ES_ARCHIVE } from '../fixtures';

/**
 * Ingest the ES data every worker shares. `logstash_functional` backs the profiles that need a
 * non-example source (the `logstash*` app menu and pagination cases); `loadIfNeeded` keeps it a
 * no-op when another Discover suite already ingested it into the same server.
 */
globalSetupHook(
  'Setup Discover context awareness tests data',
  { tag: tags.deploymentAgnostic },
  async ({ esArchiver, log }) => {
    log.debug('[setup:context_awareness] loading context awareness ES data...');
    await esArchiver.loadIfNeeded(CONTEXT_AWARENESS_ES_ARCHIVE);
    log.debug('[setup:context_awareness] context awareness ES data ready');

    log.debug('[setup:logstash] loading logstash_functional ES data...');
    await esArchiver.loadIfNeeded(LOGSTASH_ES_ARCHIVE);
    log.debug('[setup:logstash] logstash_functional ES data ready');
  }
);
