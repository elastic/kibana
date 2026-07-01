/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook } from '@kbn/scout';
import { ES_ARCHIVE_BASIC_INDEX, ES_ARCHIVE_MAKELOGS } from '../fixtures/constants';

globalSetupHook('Setup shared data views archives', async ({ esArchiver, log }) => {
  log.debug('[setup:data_views] loading makelogs archive');
  await esArchiver.loadIfNeeded(ES_ARCHIVE_MAKELOGS);
  log.debug('[setup:data_views] loading basic_index archive');
  await esArchiver.loadIfNeeded(ES_ARCHIVE_BASIC_INDEX);
});
