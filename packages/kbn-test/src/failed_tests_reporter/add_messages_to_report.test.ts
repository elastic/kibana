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

import Path from 'path';

import { ToolingLog } from '@kbn/dev-utils';
// @ts-ignore
import { createPatch } from 'diff';

// turns out Jest can't encode xml diffs in their JUnit reports...
expect.addSnapshotSerializer({
  test: v => typeof v === 'string' && (v.includes('<') || v.includes('>')),
  print: v =>
    v
      .replace(/</g, '‹')
      .replace(/>/g, '›')
      .replace(/^\s+$/gm, ''),
});

jest.mock('fs', () => {
  const realFs = jest.requireActual('fs');
  return {
    readFile: realFs.read,
    writeFile: (...args: any[]) => {
      setTimeout(args[args.length - 1], 0);
    },
  };
});

import { FTR_REPORT, JEST_REPORT, MOCHA_REPORT, KARMA_REPORT } from './__fixtures__';
import { parseTestReport } from './test_report';
import { addMessagesToReport } from './add_messages_to_report';

beforeEach(() => {
  jest.resetAllMocks();
});

const log = new ToolingLog();

it('rewrites ftr reports with minimal changes', async () => {
  const xml = await addMessagesToReport({
    report: await parseTestReport(FTR_REPORT),
    messages: [
      {
        name: 'maps app  maps loaded from sample data ecommerce "before all" hook',
        classname:
          'Chrome X-Pack UI Functional Tests.x-pack/test/functional/apps/maps/sample_data·js',
        message: 'foo bar',
      },
    ],
    log,
    reportPath: Path.resolve(__dirname, './__fixtures__/ftr_report.xml'),
  });

  expect(createPatch('ftr.xml', FTR_REPORT, xml, { context: 0 })).toMatchInlineSnapshot(`
    Index: ftr.xml
    ===================================================================
    --- ftr.xml	[object Object]
    +++ ftr.xml
    @@ -1,53 +1,56 @@
     ‹?xml version="1.0" encoding="utf-8"?›
     ‹testsuites›
       ‹testsuite timestamp="2019-06-05T23:37:10" time="903.670" tests="129" failures="5" skipped="71"›
         ‹testcase name="maps app  maps loaded from sample data ecommerce &quot;before all&quot; hook" classname="Chrome X-Pack UI Functional Tests.x-pack/test/functional/apps/maps/sample_data·js" time="154.378"›
    -      ‹system-out›
    -        ‹![CDATA[[00:00:00]       │
    +      ‹system-out›Failed Tests Reporter:
    +  - foo bar
    +
    +
    +        [00:00:00]       │
     [00:07:04]         └-: maps app
     ...
     [00:15:02]                   │
    -]]›
    +
           ‹/system-out›
           ‹failure›
    -        ‹![CDATA[Error: retry.try timeout: TimeoutError: Waiting for element to be located By(css selector, [data-test-subj~="layerTocActionsPanelToggleButtonRoad_Map_-_Bright"])
    +        Error: retry.try timeout: TimeoutError: Waiting for element to be located By(css selector, [data-test-subj~="layerTocActionsPanelToggleButtonRoad_Map_-_Bright"])
     Wait timed out after 10055ms
         at /var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-ciGroup7/node/immutable/kibana/node_modules/selenium-webdriver/lib/webdriver.js:834:17
         at process._tickCallback (internal/process/next_tick.js:68:7)
         at lastError (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-ciGroup7/node/immutable/kibana/test/common/services/retry/retry_for_success.ts:28:9)
    -    at onFailure (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-ciGroup7/node/immutable/kibana/test/common/services/retry/retry_for_success.ts:68:13)]]›
    +    at onFailure (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-ciGroup7/node/immutable/kibana/test/common/services/retry/retry_for_success.ts:68:13)
           ‹/failure›
         ‹/testcase›
         ‹testcase name="maps app &quot;after all&quot; hook" classname="Chrome X-Pack UI Functional Tests.x-pack/test/functional/apps/maps" time="0.179" metadata-json="{&quot;messages&quot;:[&quot;foo&quot;],&quot;screenshots&quot;:[{&quot;name&quot;:&quot;failure[dashboard app using current data dashboard snapshots compare TSVB snapshot]&quot;,&quot;url&quot;:&quot;https://storage.googleapis.com/kibana-ci-artifacts/jobs/elastic+kibana+7.x/1632/kibana-oss-tests/test/functional/screenshots/failure/dashboard%20app%20using%20current%20data%20dashboard%20snapshots%20compare%20TSVB%20snapshot.png&quot;}]}"›
           ‹system-out›
    -        ‹![CDATA[[00:00:00]       │
    +        [00:00:00]       │
     [00:07:04]         └-: maps app
     ...
    -]]›
    +
           ‹/system-out›
           ‹failure›
    -        ‹![CDATA[{ NoSuchSessionError: This driver instance does not have a valid session ID (did you call WebDriver.quit()?) and may no longer be used.
    +        { NoSuchSessionError: This driver instance does not have a valid session ID (did you call WebDriver.quit()?) and may no longer be used.
         at promise.finally (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-ciGroup7/node/immutable/kibana/node_modules/selenium-webdriver/lib/webdriver.js:726:38)
         at Object.thenFinally [as finally] (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-ciGroup7/node/immutable/kibana/node_modules/selenium-webdriver/lib/promise.js:124:12)
    -    at process._tickCallback (internal/process/next_tick.js:68:7) name: 'NoSuchSessionError', remoteStacktrace: '' }]]›
    +    at process._tickCallback (internal/process/next_tick.js:68:7) name: 'NoSuchSessionError', remoteStacktrace: '' }
           ‹/failure›
         ‹/testcase›
         ‹testcase name="InfraOps app feature controls infrastructure security global infrastructure all privileges shows infrastructure navlink" classname="Chrome X-Pack UI Functional Tests.x-pack/test/functional/apps/infra/feature_controls/infrastructure_security·ts"›
           ‹system-out›
    -        ‹![CDATA[[00:00:00]       │
    +        [00:00:00]       │
     [00:05:13]         └-: InfraOps app
     ...
    -]]›
    +
           ‹/system-out›
           ‹skipped/›
         ‹/testcase›
         ‹testcase name="machine learning anomaly detection saved search  with lucene query job creation opens the advanced section" classname="Firefox XPack UI Functional Tests.x-pack/test/functional/apps/machine_learning/anomaly_detection/saved_search_job·ts" time="6.040"›
    -      ‹system-out›‹![CDATA[[00:21:57]         └-: machine learning...]]›‹/system-out›
    -      ‹failure›‹![CDATA[{ NoSuchSessionError: Tried to run command without establishing a connection
    +      ‹system-out›[00:21:57]         └-: machine learning...‹/system-out›
    +      ‹failure›{ NoSuchSessionError: Tried to run command without establishing a connection
         at Object.throwDecodedError (/dev/shm/workspace/kibana/node_modules/selenium-webdriver/lib/error.js:550:15)
         at parseHttpResponse (/dev/shm/workspace/kibana/node_modules/selenium-webdriver/lib/http.js:563:13)
         at Executor.execute (/dev/shm/workspace/kibana/node_modules/selenium-webdriver/lib/http.js:489:26)
    -    at process._tickCallback (internal/process/next_tick.js:68:7) name: 'NoSuchSessionError', remoteStacktrace: '' }]]›‹/failure›
    +    at process._tickCallback (internal/process/next_tick.js:68:7) name: 'NoSuchSessionError', remoteStacktrace: '' }‹/failure›
         ‹/testcase›
       ‹/testsuite›
    -‹/testsuites›
    +‹/testsuites›
    \\ No newline at end of file

  `);
});

it('rewrites jest reports with minimal changes', async () => {
  const xml = await addMessagesToReport({
    report: await parseTestReport(JEST_REPORT),
    messages: [
      {
        classname: 'X-Pack Jest Tests.x-pack/legacy/plugins/code/server/lsp',
        name: 'launcher can reconnect if process died',
        message: 'foo bar',
      },
    ],
    log,
    reportPath: Path.resolve(__dirname, './__fixtures__/jest_report.xml'),
  });

  expect(createPatch('jest.xml', JEST_REPORT, xml, { context: 0 })).toMatchInlineSnapshot(`
    Index: jest.xml
    ===================================================================
    --- jest.xml	[object Object]
    +++ jest.xml
    @@ -3,13 +3,17 @@
       ‹testsuite name="x-pack/legacy/plugins/code/server/lsp/abstract_launcher.test.ts" timestamp="2019-06-07T03:42:21" time="14.504" tests="5" failures="1" skipped="0" file="/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-intake/node/immutable/kibana/x-pack/legacy/plugins/code/server/lsp/abstract_launcher.test.ts"›
         ‹testcase classname="X-Pack Jest Tests.x-pack/legacy/plugins/code/server/lsp" name="launcher can start and end a process" time="1.316"/›
         ‹testcase classname="X-Pack Jest Tests.x-pack/legacy/plugins/code/server/lsp" name="launcher can force kill the process if langServer can not exit" time="3.182"/›
         ‹testcase classname="X-Pack Jest Tests.x-pack/legacy/plugins/code/server/lsp" name="launcher can reconnect if process died" time="7.060"›
    -      ‹failure›
    -        ‹![CDATA[TypeError: Cannot read property '0' of undefined
    -    at Object.‹anonymous›.test (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-intake/node/immutable/kibana/x-pack/legacy/plugins/code/server/lsp/abstract_launcher.test.ts:166:10)]]›
    -      ‹/failure›
    +      ‹failure›‹![CDATA[
    +        TypeError: Cannot read property '0' of undefined
    +    at Object.‹anonymous›.test (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-intake/node/immutable/kibana/x-pack/legacy/plugins/code/server/lsp/abstract_launcher.test.ts:166:10)
    +      ]]›‹/failure›
    +      ‹system-out›Failed Tests Reporter:
    +  - foo bar
    +
    +‹/system-out›
         ‹/testcase›
         ‹testcase classname="X-Pack Jest Tests.x-pack/legacy/plugins/code/server/lsp" name="passive launcher can start and end a process" time="0.435"/›
         ‹testcase classname="X-Pack Jest Tests.x-pack/legacy/plugins/code/server/lsp" name="passive launcher should restart a process if a process died before connected" time="1.502"/›
       ‹/testsuite›
    -‹/testsuites›
    +‹/testsuites›
    \\ No newline at end of file

  `);
});

it('rewrites mocha reports with minimal changes', async () => {
  const xml = await addMessagesToReport({
    report: await parseTestReport(MOCHA_REPORT),
    messages: [
      {
        name: 'code in multiple nodes "before all" hook',
        classname: 'X-Pack Mocha Tests.x-pack/legacy/plugins/code/server/__tests__/multi_node·ts',
        message: 'foo bar',
      },
    ],
    log,
    reportPath: Path.resolve(__dirname, './__fixtures__/mocha_report.xml'),
  });

  expect(createPatch('mocha.xml', MOCHA_REPORT, xml, { context: 0 })).toMatchInlineSnapshot(`
    Index: mocha.xml
    ===================================================================
    --- mocha.xml	[object Object]
    +++ mocha.xml
    @@ -1,13 +1,16 @@
     ‹?xml version="1.0" encoding="utf-8"?›
     ‹testsuites›
       ‹testsuite timestamp="2019-06-13T23:29:36" time="30.739" tests="1444" failures="2" skipped="3"›
         ‹testcase name="code in multiple nodes &quot;before all&quot; hook" classname="X-Pack Mocha Tests.x-pack/legacy/plugins/code/server/__tests__/multi_node·ts" time="0.121"›
    -      ‹system-out›
    -        ‹![CDATA[]]›
    +      ‹system-out›Failed Tests Reporter:
    +  - foo bar
    +
    +
    +
           ‹/system-out›
    -      ‹failure›
    -        ‹![CDATA[Error: Unable to read artifact info from https://artifacts-api.elastic.co/v1/versions/8.0.0-SNAPSHOT/builds/latest/projects/elasticsearch: Service Temporarily Unavailable
    +      ‹failure›‹![CDATA[
    +        Error: Unable to read artifact info from https://artifacts-api.elastic.co/v1/versions/8.0.0-SNAPSHOT/builds/latest/projects/elasticsearch: Service Temporarily Unavailable
       ‹html›
     ‹head›‹title›503 Service Temporarily Unavailable‹/title›‹/head›
     ‹body bgcolor="white"›
     ‹center›‹h1›503 Service Temporarily Unavailable‹/h1›‹/center›
    @@ -15,24 +18,24 @@
     ‹/body›
     ‹/html›

         at Function.getSnapshot (/var/lib/jenkins/workspace/elastic+kibana+master/JOB/x-pack-intake/node/immutable/kibana/packages/kbn-es/src/artifact.js:95:13)
    -    at process._tickCallback (internal/process/next_tick.js:68:7)]]›
    -      ‹/failure›
    +    at process._tickCallback (internal/process/next_tick.js:68:7)
    +      ]]›‹/failure›
         ‹/testcase›
         ‹testcase name="code in multiple nodes &quot;after all&quot; hook" classname="X-Pack Mocha Tests.x-pack/legacy/plugins/code/server/__tests__/multi_node·ts" time="0.003"›
           ‹system-out›
    -        ‹![CDATA[]]›
    +
           ‹/system-out›
           ‹failure›
    -        ‹![CDATA[TypeError: Cannot read property 'shutdown' of undefined
    +        TypeError: Cannot read property 'shutdown' of undefined
         at Context.shutdown (plugins/code/server/__tests__/multi_node.ts:125:23)
    -    at process.topLevelDomainCallback (domain.js:120:23)]]›
    +    at process.topLevelDomainCallback (domain.js:120:23)
           ‹/failure›
         ‹/testcase›
         ‹testcase name="repository service test can not clone a repo by ssh without a key" classname="X-Pack Mocha Tests.x-pack/legacy/plugins/code/server/__tests__/repository_service·ts" time="0.005"›
           ‹system-out›
    -        ‹![CDATA[]]›
    +
           ‹/system-out›
         ‹/testcase›
       ‹/testsuite›
    -‹/testsuites›
    +‹/testsuites›
    \\ No newline at end of file

  `);
});

it('rewrites karma reports with minimal changes', async () => {
  const xml = await addMessagesToReport({
    report: await parseTestReport(KARMA_REPORT),
    messages: [
      {
        name:
          'CoordinateMapsVisualizationTest CoordinateMapsVisualization - basics should initialize OK',
        classname: 'Browser Unit Tests.CoordinateMapsVisualizationTest',
        message: 'foo bar',
      },
    ],
    log,
    reportPath: Path.resolve(__dirname, './__fixtures__/karma_report.xml'),
  });

  expect(createPatch('karma.xml', KARMA_REPORT, xml, { context: 0 })).toMatchInlineSnapshot(`
    Index: karma.xml
    ===================================================================
    --- karma.xml	[object Object]
    +++ karma.xml
    @@ -1,5 +1,5 @@
    -‹?xml version="1.0"?›
    +‹?xml version="1.0" encoding="utf-8"?›
     ‹testsuite name="Chrome 75.0.3770 (Mac OS X 10.14.5)" package="" timestamp="2019-07-02T19:53:21" id="0" hostname="spalger.lan" tests="648" errors="0" failures="4" time="1.759"›
       ‹properties›
         ‹property name="browser.fullName" value="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.100 Safari/537.36"/›
       ‹/properties›
    @@ -7,27 +7,31 @@
       ‹testcase name="Vis-Editor-Agg-Params plugin directive should hide custom label parameter" time="0" classname="Browser Unit Tests.Vis-Editor-Agg-Params plugin directive"›
         ‹skipped/›
       ‹/testcase›
       ‹testcase name="CoordinateMapsVisualizationTest CoordinateMapsVisualization - basics should initialize OK" time="0.265" classname="Browser Unit Tests.CoordinateMapsVisualizationTest"›
    -    ‹failure type=""›Error: expected 7069 to be below 64
    -    at Assertion.__kbnBundles__.tests../packages/kbn-expect/expect.js.Assertion.assert (http://localhost:5610/bundles/tests.bundle.js?shards=4&amp;shard_num=1:13671:11)
    -    at Assertion.__kbnBundles__.tests../packages/kbn-expect/expect.js.Assertion.lessThan.Assertion.below (http://localhost:5610/bundles/tests.bundle.js?shards=4&amp;shard_num=1:13891:8)
    -    at Function.lessThan (http://localhost:5610/bundles/tests.bundle.js?shards=4&amp;shard_num=1:14078:15)
    -    at _callee3$ (http://localhost:5610/bundles/tests.bundle.js?shards=4&amp;shard_num=1:158985:60)
    +    ‹failure type=""›‹![CDATA[Error: expected 7069 to be below 64
    +    at Assertion.__kbnBundles__.tests../packages/kbn-expect/expect.js.Assertion.assert (http://localhost:5610/bundles/tests.bundle.js?shards=4&shard_num=1:13671:11)
    +    at Assertion.__kbnBundles__.tests../packages/kbn-expect/expect.js.Assertion.lessThan.Assertion.below (http://localhost:5610/bundles/tests.bundle.js?shards=4&shard_num=1:13891:8)
    +    at Function.lessThan (http://localhost:5610/bundles/tests.bundle.js?shards=4&shard_num=1:14078:15)
    +    at _callee3$ (http://localhost:5610/bundles/tests.bundle.js?shards=4&shard_num=1:158985:60)
         at tryCatch (webpack://%5Bname%5D/./node_modules/regenerator-runtime/runtime.js?:62:40)
         at Generator.invoke [as _invoke] (webpack://%5Bname%5D/./node_modules/regenerator-runtime/runtime.js?:288:22)
    -    at Generator.prototype.&lt;computed&gt; [as next] (webpack://%5Bname%5D/./node_modules/regenerator-runtime/runtime.js?:114:21)
    -    at asyncGeneratorStep (http://localhost:5610/bundles/tests.bundle.js?shards=4&amp;shard_num=1:158772:103)
    -    at _next (http://localhost:5610/bundles/tests.bundle.js?shards=4&amp;shard_num=1:158774:194)
    -‹/failure›
    +    at Generator.prototype.‹computed› [as next] (webpack://%5Bname%5D/./node_modules/regenerator-runtime/runtime.js?:114:21)
    +    at asyncGeneratorStep (http://localhost:5610/bundles/tests.bundle.js?shards=4&shard_num=1:158772:103)
    +    at _next (http://localhost:5610/bundles/tests.bundle.js?shards=4&shard_num=1:158774:194)
    +]]›‹/failure›
    +    ‹system-out›Failed Tests Reporter:
    +  - foo bar
    +
    +‹/system-out›
       ‹/testcase›
       ‹testcase name="CoordinateMapsVisualizationTest CoordinateMapsVisualization - basics should toggle to Heatmap OK" time="0.055" classname="Browser Unit Tests.CoordinateMapsVisualizationTest"/›
       ‹testcase name="VegaParser._parseSchema should warn on vega-lite version too new to be supported" time="0.001" classname="Browser Unit Tests.VegaParser·_parseSchema"/›
       ‹system-out›
    -    ‹![CDATA[Chrome 75.0.3770 (Mac OS X 10.14.5) LOG: 'ready to load tests for shard 1 of 4'
    +    Chrome 75.0.3770 (Mac OS X 10.14.5) LOG: 'ready to load tests for shard 1 of 4'
     ,Chrome 75.0.3770 (Mac OS X 10.14.5) WARN: 'Unmatched GET to http://localhost:9876/api/interpreter/fns'
     ...

    -]]›
    +
       ‹/system-out›
       ‹system-err/›
    -‹/testsuite›
    +‹/testsuite›
    \\ No newline at end of file

  `);
});
