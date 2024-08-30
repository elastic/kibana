/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getFailures } from './get_failures';
import { parseTestReport } from './test_report';
import { FTR_REPORT, JEST_REPORT, MOCHA_REPORT } from './__fixtures__';

it('discovers failures in ftr report', async () => {
  const failures = getFailures(await parseTestReport(FTR_REPORT));
  expect(failures).toMatchInlineSnapshot(`
    Array [
      Object {
        "classname": "Chrome X-Pack UI Functional Tests.x-pack/test/functional/apps/maps/sample_data·js",
        "commandLine": "node scripts/functional_tests --config=x-pack/test/api_integration/apis/status/config.ts",
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
        "system-out": "
            [00:00:00]       │
    [00:07:04]         └-: maps app
    ...
    [00:15:02]                   │

          ",
        "time": "154.378",
      },
      Object {
        "classname": "Chrome X-Pack UI Functional Tests.x-pack/test/functional/apps/maps",
        "commandLine": "node scripts/functional_tests --config=x-pack/test/api_integration/apis/status/config.ts",
        "failure": "
            { NoSuchSessionError: This driver instance does not have a valid session ID (did you call WebDriver.quit()?) and may no longer be used.
        at promise.finally (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-ciGroup7/node/immutable/kibana/node_modules/selenium-webdriver/lib/webdriver.js:726:38)
        at Object.thenFinally [as finally] (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-ciGroup7/node/immutable/kibana/node_modules/selenium-webdriver/lib/promise.js:124:12)
        at process._tickCallback (internal/process/next_tick.js:68:7) name: 'NoSuchSessionError', remoteStacktrace: '' }
          ",
        "likelyIrrelevant": true,
        "metadata-json": "{\\"messages\\":[\\"foo\\"],\\"screenshots\\":[{\\"name\\":\\"failure[dashboard app using current data dashboard snapshots compare TSVB snapshot]\\",\\"url\\":\\"https://storage.googleapis.com/kibana-ci-artifacts/jobs/elastic+kibana+7.x/1632/kibana-oss-tests/test/functional/screenshots/failure/dashboard%20app%20using%20current%20data%20dashboard%20snapshots%20compare%20TSVB%20snapshot.png\\"}]}",
        "name": "maps app \\"after all\\" hook",
        "system-out": "
            [00:00:00]       │
    [00:07:04]         └-: maps app
    ...

          ",
        "time": "0.179",
      },
      Object {
        "classname": "Firefox XPack UI Functional Tests.x-pack/test/functional/apps/machine_learning/anomaly_detection/saved_search_job·ts",
        "commandLine": "node scripts/functional_tests --config=x-pack/test/api_integration/apis/status/config.ts",
        "failure": "{ NoSuchSessionError: Tried to run command without establishing a connection
        at Object.throwDecodedError (/dev/shm/workspace/kibana/node_modules/selenium-webdriver/lib/error.js:550:15)
        at parseHttpResponse (/dev/shm/workspace/kibana/node_modules/selenium-webdriver/lib/http.js:563:13)
        at Executor.execute (/dev/shm/workspace/kibana/node_modules/selenium-webdriver/lib/http.js:489:26)
        at process._tickCallback (internal/process/next_tick.js:68:7) name: 'NoSuchSessionError', remoteStacktrace: '' }",
        "likelyIrrelevant": true,
        "name": "machine learning anomaly detection saved search  with lucene query job creation opens the advanced section",
        "system-out": "[00:21:57]         └-: machine learning...",
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
        "commandLine": "node scripts/jest --config some/jest/config.ts",
        "failure": "
            TypeError: Cannot read property '0' of undefined
        at Object.<anonymous>.test (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-intake/node/immutable/kibana/x-pack/legacy/plugins/code/server/lsp/abstract_launcher.test.ts:166:10)
          ",
        "likelyIrrelevant": false,
        "name": "launcher can reconnect if process died",
        "system-out": "",
        "time": "7.060",
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
        "commandLine": "node scripts/functional_tests --config super-mocha-test.config.js",
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
        "system-out": "
            
          ",
        "time": "0.121",
      },
      Object {
        "classname": "X-Pack Mocha Tests.x-pack/legacy/plugins/code/server/__tests__/multi_node·ts",
        "commandLine": "node scripts/functional_tests --config super-mocha-test.config.js",
        "failure": "
            TypeError: Cannot read property 'shutdown' of undefined
        at Context.shutdown (plugins/code/server/__tests__/multi_node.ts:125:23)
        at process.topLevelDomainCallback (domain.js:120:23)
          ",
        "likelyIrrelevant": true,
        "name": "code in multiple nodes \\"after all\\" hook",
        "system-out": "
            
          ",
        "time": "0.003",
      },
    ]
  `);
});
