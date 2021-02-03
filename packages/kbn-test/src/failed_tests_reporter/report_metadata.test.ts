/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getReportMessageIter } from './report_metadata';
import { parseTestReport } from './test_report';
import { FTR_REPORT, JEST_REPORT, MOCHA_REPORT } from './__fixtures__';

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
});
