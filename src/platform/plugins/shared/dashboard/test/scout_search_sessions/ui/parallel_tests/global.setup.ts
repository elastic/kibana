/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';
import { LOGSTASH_FUNCTIONAL_ARCHIVE } from '@kbn/data-plugin/test/scout_search_sessions/ui/fixtures';

/**
 * Load Elasticsearch data once before any parallel worker starts. `loadIfNeeded` makes this a
 * no-op when a sibling background search config has already ingested the archive into the shared
 * server.
 */
globalSetupHook(
  'Ingest ES data for Background Search UI tests',
  { tag: '@local-stateful-classic' },
  async ({ esArchiver }) => {
    await esArchiver.loadIfNeeded(LOGSTASH_FUNCTIONAL_ARCHIVE);
  }
);
