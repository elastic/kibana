/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
  fipsIsEnabled,
} from './src/functional_tests/lib';

export { initLogsDir } from './src/functional_tests/lib';
export {
  SamlSessionManager,
  type SamlSessionManagerOptions,
  type HostOptions,
  type GetCookieOptions,
  type Role,
} from '@kbn/test-saml-auth';

export type {
  CreateTestEsClusterOptions,
  EsTestCluster,
  ICluster,
  EsClientForTestingOptions,
} from '@kbn/test-es-server';
export { esTestConfig, createTestEsCluster, createEsClientForTesting } from '@kbn/test-es-server';
export { createEsClientForFtrConfig, createRemoteEsClientForFtrConfig } from './src/ftr_es_client';

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

export { CI_PARALLEL_PROCESS_PREFIX } from '@kbn/test-es-server';

export * from './src/functional_test_runner';

export { getUrl } from './src/jest/get_url';

export { runCheckJestConfigsCli } from './src/jest/run_check_jest_configs_cli';

export { runJest } from './src/jest/run';
export {
  executeJestValidation,
  JEST_LABEL,
  JEST_LOG_PREFIX,
  planJestContractRuns,
  runJestContract,
} from './src/jest/run_contract';
export type { JestConfigResult, JestValidationResult } from './src/jest/run_contract';

export { runJestAll } from './src/jest/run_all';

export * from './src/kbn_archiver_cli';

export * from '@kbn/kbn-client';

export { findTestPluginPaths } from '@kbn/test-kibana-server';

export { getDockerFileMountPath } from '@kbn/es';

// Docker server config + Fleet package registry image (implemented in @kbn/test-docker-servers).
export type { DockerServer, DockerServerSpec } from '@kbn/test-docker-servers';
export {
  defineDockerServersConfig,
  dockerRegistryPort,
  fleetPackageRegistryDockerImage,
  packageRegistryDocker,
} from '@kbn/test-docker-servers';
