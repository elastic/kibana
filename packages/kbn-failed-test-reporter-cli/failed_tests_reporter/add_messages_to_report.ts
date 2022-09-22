/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import { promisify } from 'util';

import { ToolingLog } from '@kbn/tooling-log';
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

    if (typeof testCase.failure[0] === 'object' && testCase.failure[0].$.message) {
      // failure with "messages" ignore the system-out on jenkins
      // so we instead extend the failure message
      testCase.failure[0]._ = output + testCase.failure[0]._;
    } else if (!testCase['system-out']) {
      testCase['system-out'] = [{ _: output }];
    } else if (typeof testCase['system-out'][0] === 'string') {
      testCase['system-out'][0] = { _: output + testCase['system-out'][0] };
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
