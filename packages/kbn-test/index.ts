/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { KbnClientRequesterError } from './src/kbn_client/kbn_client_requester_error';

// @internal
export { startServersCli, startServers } from './src/functional_tests/start_servers';

// @internal
export { runTestsCli, runTests } from './src/functional_tests/run_tests';
export {
  runElasticsearch,
  runKibanaServer,
  parseRawFlags,
  getArgValue,
  remapPluginPaths,
  getKibanaCliArg,
  getKibanaCliLoggers,
  cleanupElasticsearch,
} from './src/functional_tests/lib';

export { initLogsDir } from './src/functional_tests/lib';
export {
  SamlSessionManager,
  type SamlSessionManagerOptions,
  type HostOptions,
  type GetCookieOptions,
} from './src/auth';

export type {
  CreateTestEsClusterOptions,
  EsTestCluster,
  ICluster,
  EsClientForTestingOptions,
} from './src/es';
export {
  esTestConfig,
  createTestEsCluster,
  createEsClientForTesting,
  createEsClientForFtrConfig,
  createRemoteEsClientForFtrConfig,
} from './src/es';

export { kbnTestConfig } from './kbn_test_config';
export type { UrlParts } from './kbn_test_config';

export {
  kibanaServerTestUser,
  kibanaTestUser,
  adminTestUser,
  systemIndicesSuperuser,
  kibanaTestSuperuserServerless,
} from './src/kbn';

// @internal
export { setupJUnitReportGeneration, escapeCdata } from './src/mocha';

export { CI_PARALLEL_PROCESS_PREFIX } from './src/ci_parallel_process_prefix';

export * from './src/functional_test_runner';

export { getUrl } from './src/jest/get_url';

export { runCheckJestConfigsCli } from './src/jest/run_check_jest_configs_cli';

export { runCheckFtrCodeOwnersCli } from './src/functional_test_runner/run_check_ftr_code_owners';

export { runJest } from './src/jest/run';

export * from './src/kbn_archiver_cli';

export * from './src/kbn_client';

export * from './src/find_test_plugin_paths';

export { getDockerFileMountPath } from '@kbn/es';
