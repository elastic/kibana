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

import { getFailures } from './get_failures';
import { parseTestReport } from './test_report';
import { FTR_REPORT, JEST_REPORT, KARMA_REPORT, MOCHA_REPORT } from './__fixtures__';

it('discovers failures in ftr report', async () => {
  const failures = getFailures(await parseTestReport(FTR_REPORT));
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
        "likelyIrrelevant": false,
        "name": "maps app  maps loaded from sample data ecommerce \\"before all\\" hook",
        "time": "154.378",
      },
      Object {
        "classname": "Chrome X-Pack UI Functional Tests.x-pack/test/functional/apps/maps",
        "failure": "
            { NoSuchSessionError: This driver instance does not have a valid session ID (did you call WebDriver.quit()?) and may no longer be used.
        at promise.finally (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-ciGroup7/node/immutable/kibana/node_modules/selenium-webdriver/lib/webdriver.js:726:38)
        at Object.thenFinally [as finally] (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-ciGroup7/node/immutable/kibana/node_modules/selenium-webdriver/lib/promise.js:124:12)
        at process._tickCallback (internal/process/next_tick.js:68:7) name: 'NoSuchSessionError', remoteStacktrace: '' }
          ",
        "likelyIrrelevant": true,
        "name": "maps app \\"after all\\" hook",
        "time": "0.179",
      },
      Object {
        "classname": "Firefox XPack UI Functional Tests.x-pack/test/functional/apps/machine_learning/anomaly_detection/saved_search_job·ts",
        "failure": "{ NoSuchSessionError: Tried to run command without establishing a connection
        at Object.throwDecodedError (/dev/shm/workspace/kibana/node_modules/selenium-webdriver/lib/error.js:550:15)
        at parseHttpResponse (/dev/shm/workspace/kibana/node_modules/selenium-webdriver/lib/http.js:563:13)
        at Executor.execute (/dev/shm/workspace/kibana/node_modules/selenium-webdriver/lib/http.js:489:26)
        at process._tickCallback (internal/process/next_tick.js:68:7) name: 'NoSuchSessionError', remoteStacktrace: '' }",
        "likelyIrrelevant": true,
        "name": "machine learning anomaly detection saved search  with lucene query job creation opens the advanced section",
        "time": "6.040",
      },
    ]
  `);
});

it('discovers failures in jest report', async () => {
  const failures = getFailures(await parseTestReport(JEST_REPORT));
  expect(failures).toMatchInlineSnapshot(`
    Array [
      Object {
        "classname": "X-Pack Jest Tests.x-pack/legacy/plugins/code/server/lsp",
        "failure": "
            TypeError: Cannot read property '0' of undefined
        at Object.<anonymous>.test (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-intake/node/immutable/kibana/x-pack/legacy/plugins/code/server/lsp/abstract_launcher.test.ts:166:10)
          ",
        "likelyIrrelevant": false,
        "name": "launcher can reconnect if process died",
        "time": "7.060",
      },
    ]
  `);
});

it('discovers failures in karma report', async () => {
  const failures = getFailures(await parseTestReport(KARMA_REPORT));
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
        "likelyIrrelevant": false,
        "name": "CoordinateMapsVisualizationTest CoordinateMapsVisualization - basics should initialize OK",
        "time": "0.265",
      },
    ]
  `);
});

it('discovers failures in mocha report', async () => {
  const failures = getFailures(await parseTestReport(MOCHA_REPORT));
  expect(failures).toMatchInlineSnapshot(`
    Array [
      Object {
        "classname": "X-Pack Mocha Tests.x-pack/legacy/plugins/code/server/__tests__/multi_node·ts",
        "failure": "
            Error: Unable to read artifact info from https://artifacts-api.elastic.co/v1/versions/8.0.0-SNAPSHOT/builds/latest/projects/elasticsearch: Service Temporarily Unavailable
      <html>
    <head><title>503 Service Temporarily Unavailable</title></head>
    <body bgcolor=\\"white\\">
    <center><h1>503 Service Temporarily Unavailable</h1></center>
    <hr><center>nginx/1.13.7</center>
    </body>
    </html>

        at Function.getSnapshot (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-intake/node/immutable/kibana/packages/kbn-es/src/artifact.js:95:13)
        at process._tickCallback (internal/process/next_tick.js:68:7)
          ",
        "likelyIrrelevant": true,
        "name": "code in multiple nodes \\"before all\\" hook",
        "time": "0.121",
      },
      Object {
        "classname": "X-Pack Mocha Tests.x-pack/legacy/plugins/code/server/__tests__/multi_node·ts",
        "failure": "
            TypeError: Cannot read property 'shutdown' of undefined
        at Context.shutdown (plugins/code/server/__tests__/multi_node.ts:125:23)
        at process.topLevelDomainCallback (domain.js:120:23)
          ",
        "likelyIrrelevant": true,
        "name": "code in multiple nodes \\"after all\\" hook",
        "time": "0.003",
      },
    ]
  `);
});
