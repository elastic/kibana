/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalSetupHook, tags } from '@kbn/scout';
import { LOGS_SAMPLE_DATA_SET_ID } from '../constants';

const READY_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

globalSetupHook(
  'Install sample data needed for Dashboard sample data tests',
  { tag: tags.stateful.classic },
  async ({ apiServices, esClient, log }) => {
    log.info('[setup] Installing logs sample data in the default space...');
    await apiServices.sampleData.install(LOGS_SAMPLE_DATA_SET_ID);

    // Wait until the sample data can answer the options list terms aggregation.
    // Otherwise the control's suggestions request returns 400 and the dashboard never finishes rendering.
    const deadline = Date.now() + READY_TIMEOUT_MS;
    for (;;) {
      try {
        await esClient.search({
          index: 'kibana_sample_data_logs',
          size: 0,
          aggs: { options: { terms: { field: 'machine.os.keyword' } } },
        });
        break;
      } catch (error) {
        if (Date.now() > deadline) {
          throw new Error(`Logs sample data was not ready in time: ${error}`);
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    }
    log.info('[setup] Logs sample data installed');
  }
);
