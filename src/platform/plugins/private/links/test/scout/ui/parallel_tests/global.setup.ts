/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook, tags } from '@kbn/scout';
import { DASHBOARD_ES_ARCHIVE } from '../constants';

globalSetupHook(
  'Ingest ES data needed for Links panel tests',
  { tag: tags.deploymentAgnostic },
  async ({ esArchiver, log }) => {
    log.info('[setup] Loading ES archive for Links panel Scout tests...');
    // The dashboards' data view needs an existing time-based index for the time picker to be enabled.
    await esArchiver.loadIfNeeded(DASHBOARD_ES_ARCHIVE);
  }
);
