/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';
import { testData } from '../fixtures';

globalSetupHook('Setup environment for TSVB tests', async ({ esArchiver }) => {
  await Promise.all([
    esArchiver.loadIfNeeded(testData.ES_ARCHIVE_PATHS.LOGSTASH),
    esArchiver.loadIfNeeded(testData.ES_ARCHIVE_PATHS.LONG_WINDOW_LOGSTASH),
  ]);
});
