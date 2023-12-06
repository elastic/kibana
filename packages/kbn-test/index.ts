/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { getDockerFileMountPath } from '@kbn/es';
export { kbnTestConfig } from './kbn_test_config';
export { SAMLSessionManager } from './src/auth';
export { CI_PARALLEL_PROCESS_PREFIX } from './src/ci_parallel_process_prefix';
export {
  createEsClientForFtrConfig,
  createEsClientForTesting,
  createRemoteEsClientForFtrConfig,
  createTestEsCluster,
  esTestConfig,
} from './src/es';
export type {
  CreateTestEsClusterOptions,
  EsClientForTestingOptions,
  EsTestCluster,
  ICluster,
} from './src/es';
export * from './src/find_test_plugin_paths';
export { runElasticsearch, runKibanaServer } from './src/functional_tests/lib';
export { getKibanaCliArg, getKibanaCliLoggers } from './src/functional_tests/lib/kibana_cli_args';
// @internal
export { runTests, runTestsCli } from './src/functional_tests/run_tests';
// @internal
export { startServers, startServersCli } from './src/functional_tests/start_servers';
export * from './src/functional_test_runner';
export { getUrl } from './src/jest/get_url';
export { runJest } from './src/jest/run';
export { runCheckJestConfigsCli } from './src/jest/run_check_jest_configs_cli';
export {
  adminTestUser,
  kibanaServerTestUser,
  kibanaTestSuperuserServerless,
  kibanaTestUser,
  systemIndicesSuperuser,
} from './src/kbn';
export * from './src/kbn_archiver_cli';
export * from './src/kbn_client';
export { KbnClientRequesterError } from './src/kbn_client/kbn_client_requester_error';
// @internal
export { escapeCdata, setupJUnitReportGeneration } from './src/mocha';
