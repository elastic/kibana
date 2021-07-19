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
} from './functional_tests/cli';

// @internal
export { runTestsCli, processRunTestsCliOptions, startServersCli, processStartServersCliOptions };

// @ts-ignore not typed yet
// @internal
export { runTests, startServers } from './functional_tests/tasks';

// @internal
export { KIBANA_ROOT } from './functional_tests/lib/paths';

export {
  esTestConfig,
  createTestEsCluster,
  CreateTestEsClusterOptions,
  EsTestCluster,
  ICluster,
} from './es';

export { kbnTestConfig, kibanaServerTestUser, kibanaTestUser, adminTestUser } from './kbn';

export { readConfigFile } from './functional_test_runner/lib/config/read_config_file';

export { runFtrCli } from './functional_test_runner/cli';

// @internal
export { setupJUnitReportGeneration, escapeCdata } from './mocha';

export { runFailedTestsReporterCli } from './failed_tests_reporter';

export { CI_PARALLEL_PROCESS_PREFIX } from './ci_parallel_process_prefix';

export * from './functional_test_runner';

export { getUrl } from './jest/utils/get_url';

export { runCheckJestConfigsCli } from './jest/run_check_jest_configs_cli';

export { runJest } from './jest/run';

export * from './kbn_archiver_cli';

export * from './kbn_client';
