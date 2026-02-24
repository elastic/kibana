/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tags } from '@kbn/scout';

export const TSDB_LOGS_DEFAULT_START_TIME = '2023-03-28T09:17:00.000Z';
export const TSDB_LOGS_DEFAULT_END_TIME = '2023-06-28T09:17:00.000Z';

export const METRICS_TEST_INDEX_NAME = 'test-metrics-experience';

export const ESQL_QUERIES = {
  TS_TSDB_LOGS: 'TS kibana_sample_data_logstsdb',
  FROM_TSDB_LOGS: 'FROM kibana_sample_data_logstsdb',
  TS_METRICS_TEST: `TS ${METRICS_TEST_INDEX_NAME}`,
};

export const DATA_VIEW_NAME = {
  TSDB_LOGS: 'Kibana Sample Data Logs (TSDB)',
};

export const ES_ARCHIVES = {
  TSDB_LOGS: 'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_logs_tsdb',
};

export const KBN_ARCHIVES = {
  TSDB_LOGS: 'src/platform/test/functional/fixtures/kbn_archiver/kibana_sample_data_logs_tsdb.json',
};

export const METRICS_EXPERIENCE_TAGS = [
  ...tags.stateful.all,
  ...tags.serverless.observability.complete,
];
