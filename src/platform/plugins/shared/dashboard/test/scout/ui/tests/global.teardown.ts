/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalTeardownHook, tags } from '@kbn/scout';
import { LOGS_SAMPLE_DATA_SET_ID } from '../constants';

globalTeardownHook(
  'Remove sample data installed for Dashboard sample data tests',
  { tag: tags.stateful.classic },
  async ({ apiServices, log }) => {
    log.info('[teardown] Removing logs sample data from the default space...');
    await apiServices.sampleData.remove(LOGS_SAMPLE_DATA_SET_ID);
    log.info('[teardown] Logs sample data removed');
  }
);
