/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
export { OPTIMIZE_BUNDLE_DIR, KIBANA_ROOT } from './functional_tests/lib/paths';

// @ts-ignore not typed yet
export { esTestConfig, createLegacyEsTestCluster } from './legacy_es';

// @ts-ignore not typed yet
export { kbnTestConfig, kibanaServerTestUser, kibanaTestUser, adminTestUser } from './kbn';

// @ts-ignore not typed yet
export { setupUsers, DEFAULT_SUPERUSER_PASS } from './functional_tests/lib/auth';

export { readConfigFile } from './functional_test_runner/lib/config/read_config_file';

export { runFtrCli } from './functional_test_runner/cli';

export {
  createAutoJUnitReporter,
  runMochaCli,
  setupJUnitReportGeneration,
  escapeCdata,
} from './mocha';

export { runFailedTestsReporterCli } from './failed_tests_reporter';

export { makeJunitReportPath } from './junit_report_path';

export { CI_PARALLEL_PROCESS_PREFIX } from './ci_parallel_process_prefix';

export * from './functional_test_runner';
