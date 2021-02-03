/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  runTestsCli,
  processRunTestsCliOptions,
  startServersCli,
  processStartServersCliOptions,
  // @ts-ignore not typed yet
} from './functional_tests/cli';

export { runTestsCli, processRunTestsCliOptions, startServersCli, processStartServersCliOptions };

// @ts-ignore not typed yet
export { runTests, startServers } from './functional_tests/tasks';

// @ts-ignore not typed yet
export { KIBANA_ROOT } from './functional_tests/lib/paths';

// @ts-ignore not typed yet
export { esTestConfig, createLegacyEsTestCluster } from './legacy_es';

// @ts-ignore not typed yet
export { kbnTestConfig, kibanaServerTestUser, kibanaTestUser, adminTestUser } from './kbn';

// @ts-ignore not typed yet
export { setupUsers, DEFAULT_SUPERUSER_PASS } from './functional_tests/lib/auth';

export { readConfigFile } from './functional_test_runner/lib/config/read_config_file';

export { runFtrCli } from './functional_test_runner/cli';

export { setupJUnitReportGeneration, escapeCdata } from './mocha';

export { runFailedTestsReporterCli } from './failed_tests_reporter';

export { CI_PARALLEL_PROCESS_PREFIX } from './ci_parallel_process_prefix';

export * from './functional_test_runner';

export { getUrl } from './jest/utils/get_url';

export { runCheckJestConfigsCli } from './jest/run_check_jest_configs_cli';

export { runJest } from './jest/run';
