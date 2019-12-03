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

import Fs from 'fs';
import { promisify } from 'util';

import { ToolingLog } from '@kbn/dev-utils';
import xml2js from 'xml2js';

import { TestReport, makeFailedTestCaseIter } from './test_report';

const writeAsync = promisify(Fs.writeFile);

export interface Update {
  classname: string;
  name: string;
  message: string;
}

/**
 * Mutate the report to include mentions of Github issues related to test failures,
 * then write the updated report to disk
 */
export async function mentionGithubIssuesInReport(
  report: TestReport,
  updates: Update[],
  log: ToolingLog,
  reportPath: string
) {
  for (const testCase of makeFailedTestCaseIter(report)) {
    const { classname, name } = testCase.$;
    const messageList = updates
      .filter((u: Update) => u.classname === classname && u.name === name)
      .reduce((acc, u) => `${acc}\n  - ${u.message}`, '');

    if (!messageList) {
      continue;
    }

    log.info(`${classname} - ${name}:${messageList}`);
    const append = `\n\nFailed Tests Reporter:${messageList}\n`;

    if (
      testCase.failure[0] &&
      typeof testCase.failure[0] === 'object' &&
      typeof testCase.failure[0]._ === 'string'
    ) {
      testCase.failure[0]._ += append;
    } else {
      testCase.failure[0] = String(testCase.failure[0]) + append;
    }
  }

  const builder = new xml2js.Builder({
    cdata: true,
    xmldec: { version: '1.0', encoding: 'utf-8' },
  });
  const xml = builder.buildObject(report);
  await writeAsync(reportPath, xml, 'utf8');
  return xml;
}
