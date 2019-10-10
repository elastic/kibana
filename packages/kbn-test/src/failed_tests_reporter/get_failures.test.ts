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

import { ToolingLog } from '@kbn/dev-utils';

import { getFailures } from './get_failures';

const log = new ToolingLog();

it('discovers failures in ftr report', async () => {
  const failures = await getFailures(log, require.resolve('./__fixtures__/ftr_report.xml'));
  expect(failures).toMatchInlineSnapshot(`
    Array [
      Object {
        "classname": "Chrome X-Pack UI Functional Tests.x-pack/test/functional/apps/maps/sample_data·js",
        "failure": "
            Error: retry.try timeout: TimeoutError: Waiting for element to be located By(css selector, [data-test-subj~=\\"layerTocActionsPanelToggleButtonRoad_Map_-_Bright\\"])
    Wait timed out after 10055ms
        at /var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-ciGroup7/node/immutable/kibana/node_modules/selenium-webdriver/lib/webdriver.js:834:17
        at process._tickCallback (internal/process/next_tick.js:68:7)
        at lastError (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-ciGroup7/node/immutable/kibana/test/common/services/retry/retry_for_success.ts:28:9)
        at onFailure (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-ciGroup7/node/immutable/kibana/test/common/services/retry/retry_for_success.ts:68:13)
          ",
        "name": "maps app  maps loaded from sample data ecommerce \\"before all\\" hook",
        "time": "154.378",
      },
    ]
  `);
});

it('discovers failures in jest report', async () => {
  const failures = await getFailures(log, require.resolve('./__fixtures__/jest_report.xml'));
  expect(failures).toMatchInlineSnapshot(`
    Array [
      Object {
        "classname": "X-Pack Jest Tests.x-pack/legacy/plugins/code/server/lsp",
        "failure": "
            TypeError: Cannot read property '0' of undefined
        at Object.<anonymous>.test (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-intake/node/immutable/kibana/x-pack/legacy/plugins/code/server/lsp/abstract_launcher.test.ts:166:10)
          ",
        "name": "launcher can reconnect if process died",
        "time": "7.060",
      },
    ]
  `);
});

it('discovers failures in karma report', async () => {
  const failures = await getFailures(log, require.resolve('./__fixtures__/karma_report.xml'));
  expect(failures).toMatchInlineSnapshot(`
    Array [
      Object {
        "classname": "Browser Unit Tests.CoordinateMapsVisualizationTest",
        "failure": "Error: expected 7069 to be below 64
        at Assertion.__kbnBundles__.tests../packages/kbn-expect/expect.js.Assertion.assert (http://localhost:5610/bundles/tests.bundle.js?shards=4&shard_num=1:13671:11)
        at Assertion.__kbnBundles__.tests../packages/kbn-expect/expect.js.Assertion.lessThan.Assertion.below (http://localhost:5610/bundles/tests.bundle.js?shards=4&shard_num=1:13891:8)
        at Function.lessThan (http://localhost:5610/bundles/tests.bundle.js?shards=4&shard_num=1:14078:15)
        at _callee3$ (http://localhost:5610/bundles/tests.bundle.js?shards=4&shard_num=1:158985:60)
        at tryCatch (webpack://%5Bname%5D/./node_modules/regenerator-runtime/runtime.js?:62:40)
        at Generator.invoke [as _invoke] (webpack://%5Bname%5D/./node_modules/regenerator-runtime/runtime.js?:288:22)
        at Generator.prototype.<computed> [as next] (webpack://%5Bname%5D/./node_modules/regenerator-runtime/runtime.js?:114:21)
        at asyncGeneratorStep (http://localhost:5610/bundles/tests.bundle.js?shards=4&shard_num=1:158772:103)
        at _next (http://localhost:5610/bundles/tests.bundle.js?shards=4&shard_num=1:158774:194)
    ",
        "name": "CoordinateMapsVisualizationTest CoordinateMapsVisualization - basics should initialize OK",
        "time": "0.265",
      },
    ]
  `);
});

it('discovers failures in mocha report', async () => {
  const failures = await getFailures(log, require.resolve('./__fixtures__/mocha_report.xml'));
  expect(failures).toMatchInlineSnapshot(`Array []`);
});
