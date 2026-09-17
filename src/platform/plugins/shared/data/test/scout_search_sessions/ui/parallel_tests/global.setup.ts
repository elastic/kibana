/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';
import { LOGSTASH_FUNCTIONAL_ARCHIVE } from '../fixtures/constants';

/**
 * Load Elasticsearch data once before any parallel worker starts.
 *
 * Only the logstash-* data archive is needed here — the background search monitor
 * task is already running on a properly-started server
 * (--data.search.sessions.enabled=true). The `dashboard/async_search` ES archive
 * only contains a `.kibana_task_manager` document that (a) cannot be written to
 * restricted system indices and (b) is redundant on a properly started server.
 */
globalSetupHook(
  'Ingest ES data for Background Search UI tests',
  { tag: '@local-stateful-classic' },
  async ({ esArchiver }) => {
    await esArchiver.loadIfNeeded(LOGSTASH_FUNCTIONAL_ARCHIVE);
  }
);
