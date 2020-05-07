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

import { getReportMessageIter } from './report_metadata';
import { parseTestReport } from './test_report';
import { FTR_REPORT, JEST_REPORT, KARMA_REPORT, MOCHA_REPORT } from './__fixtures__';

it('reads messages and screenshots from metadata-json properties', async () => {
  const ftrReport = await parseTestReport(FTR_REPORT);
  expect(Array.from(getReportMessageIter(ftrReport))).toMatchInlineSnapshot(`
    Array [
      Object {
        "classname": "Chrome X-Pack UI Functional Tests.x-pack/test/functional/apps/maps",
        "message": "foo",
        "name": "maps app \\"after all\\" hook",
      },
      Object {
        "classname": "Chrome X-Pack UI Functional Tests.x-pack/test/functional/apps/maps",
        "message": "Screenshot: failure[dashboard app using current data dashboard snapshots compare TSVB snapshot] https://storage.googleapis.com/kibana-ci-artifacts/jobs/elastic+kibana+7.x/1632/kibana-oss-tests/test/functional/screenshots/failure/dashboard%20app%20using%20current%20data%20dashboard%20snapshots%20compare%20TSVB%20snapshot.png",
        "name": "maps app \\"after all\\" hook",
      },
    ]
  `);

  const jestReport = await parseTestReport(JEST_REPORT);
  expect(Array.from(getReportMessageIter(jestReport))).toMatchInlineSnapshot(`Array []`);

  const mochaReport = await parseTestReport(MOCHA_REPORT);
  expect(Array.from(getReportMessageIter(mochaReport))).toMatchInlineSnapshot(`Array []`);

  const karmaReport = await parseTestReport(KARMA_REPORT);
  expect(Array.from(getReportMessageIter(karmaReport))).toMatchInlineSnapshot(`Array []`);
});
