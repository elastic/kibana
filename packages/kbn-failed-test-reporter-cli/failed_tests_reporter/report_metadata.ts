/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TestReport, makeTestCaseIter } from './test_report';

export function* getReportMessageIter(report: TestReport) {
  for (const testCase of makeTestCaseIter(report)) {
    const metadata = testCase.$['metadata-json'] ? JSON.parse(testCase.$['metadata-json']) : {};

    for (const message of metadata.messages || []) {
      yield {
        classname: testCase.$.classname,
        name: testCase.$.name,
        message: String(message),
      };
    }

    for (const screenshot of metadata.screenshots || []) {
      yield {
        classname: testCase.$.classname,
        name: testCase.$.name,
        message: `Screenshot: ${screenshot.name} ${screenshot.url}`,
      };
    }
  }
}
