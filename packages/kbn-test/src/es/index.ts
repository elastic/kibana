/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { createTestEsCluster } from './test_es_cluster';
export type { CreateTestEsClusterOptions, EsTestCluster, ICluster } from './test_es_cluster';
export { esTestConfig } from './es_test_config';
export {
  createEsClientForTesting,
  createEsClientForFtrConfig,
  createRemoteEsClientForFtrConfig,
} from './es_client_for_testing';
export type { EsClientForTestingOptions } from './es_client_for_testing';
