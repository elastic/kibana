/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  KibanaMigratorTestKit,
  KibanaMigratorTestKitParams,
} from './src/kibana_migrator_test_kit';
export {
  clearLog,
  currentVersion,
  defaultKibanaIndex,
  defaultKibanaTaskIndex,
  defaultLogFilePath,
  deleteSavedObjectIndices,
  getAggregatedTypesCount,
  getEsClient,
  getKibanaMigratorTestKit,
  nextMinor,
  readLog,
  startElasticsearch,
} from './src/kibana_migrator_test_kit';

export type { ElasticsearchClientWrapperFactory } from './src/elasticsearch_client_wrapper';
export { getElasticsearchClientWrapperFactory } from './src/elasticsearch_client_wrapper';
