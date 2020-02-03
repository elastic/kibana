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
