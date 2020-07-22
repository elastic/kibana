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

export interface Message {
  classname: string;
  name: string;
  message: string;
}

/**
 * Mutate the report to include mentions of Github issues related to test failures,
 * then write the updated report to disk
 */
export async function addMessagesToReport(options: {
  log: ToolingLog;
  report: TestReport;
  messages: Message[];
  reportPath: string;
  dryRun?: boolean;
}) {
  const { log, report, messages, reportPath, dryRun } = options;

  for (const testCase of makeFailedTestCaseIter(report)) {
    const { classname, name } = testCase.$;
    const messageList = messages
      .filter((u) => u.classname === classname && u.name === name)
      .reduce((acc, u) => `${acc}\n  - ${u.message}`, '');

    if (!messageList) {
      continue;
    }

    log.info(`${classname} - ${name}:${messageList}`);
    const output = `Failed Tests Reporter:${messageList}\n\n`;

    if (!testCase['system-out']) {
      testCase['system-out'] = [output];
    } else if (typeof testCase['system-out'][0] === 'string') {
      testCase['system-out'][0] = output + String(testCase['system-out'][0]);
    } else {
      testCase['system-out'][0]._ = output + testCase['system-out'][0]._;
    }
  }

  const builder = new xml2js.Builder({
    cdata: true,
    xmldec: { version: '1.0', encoding: 'utf-8' },
  });

  const xml = builder
    .buildObject(report)
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : line))
    .join('\n');

  if (dryRun) {
    log.info(`updated ${reportPath}\n${xml}`);
  } else {
    await writeAsync(reportPath, xml, 'utf8');
  }
  return xml;
}
