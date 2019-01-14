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

export { runTestsCli, startServersCli } from './functional_tests/cli';

export { runTests, startServers } from './functional_tests/tasks';

export { OPTIMIZE_BUNDLE_DIR, KIBANA_ROOT } from './functional_tests/lib/paths';

export { esTestConfig, createEsTestCluster } from './es';

export { kbnTestConfig, kibanaServerTestUser, kibanaTestUser, adminTestUser } from './kbn';

export { setupUsers, DEFAULT_SUPERUSER_PASS } from './functional_tests/lib/auth';
