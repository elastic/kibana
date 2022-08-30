/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @internal
import {
  runTestsCli,
  processRunTestsCliOptions,
  startServersCli,
  processStartServersCliOptions,
  // @ts-ignore not typed yet
} from './src/functional_tests/cli';

export { KbnClientRequesterError } from './src/kbn_client/kbn_client_requester_error';

// @internal
export { runTestsCli, processRunTestsCliOptions, startServersCli, processStartServersCliOptions };

// @ts-ignore not typed yet
// @internal
export { runTests, startServers } from './src/functional_tests/tasks';

export { getKibanaCliArg, getKibanaCliLoggers } from './src/functional_tests/lib/kibana_cli_args';

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

export {
  kbnTestConfig,
  kibanaServerTestUser,
  kibanaTestUser,
  adminTestUser,
  systemIndicesSuperuser,
} from './src/kbn';

export { readConfigFile } from './src/functional_test_runner/lib/config/read_config_file';

export { runFtrCli } from './src/functional_test_runner/cli';

// @internal
export { setupJUnitReportGeneration, escapeCdata } from './src/mocha';

export { runFailedTestsReporterCli } from './src/failed_tests_reporter';

export { CI_PARALLEL_PROCESS_PREFIX } from './src/ci_parallel_process_prefix';

export * from './src/functional_test_runner';

export { getUrl } from './src/jest/get_url';

export { runCheckJestConfigsCli } from './src/jest/run_check_jest_configs_cli';

export { runJest } from './src/jest/run';

export * from './src/kbn_archiver_cli';

export * from './src/kbn_client';
