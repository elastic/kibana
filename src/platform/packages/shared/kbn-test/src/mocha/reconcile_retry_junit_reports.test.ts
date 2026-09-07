/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'fs';
import { dirname, resolve } from 'path';

import xml2js from 'xml2js';
import { ToolingLog } from '@kbn/tooling-log';

import { getJunitReportPath } from '../report_path';
import { reconcileRetryJunitReports } from './reconcile_retry_junit_reports';

const ROOT = resolve(__dirname, '__fixtures__/reconcile_tmp');
const REPORT_NAME = 'test';
const log = new ToolingLog();

const file = (name: string) => `${REPORT_NAME}.${name.replace(/\./g, '·')}`;

interface Case {
  name: string;
  failed?: boolean;
  skipped?: boolean;
}

const buildReport = (suiteFile: string, cases: Case[]): string => {
  const testcases = cases.map((c) => {
    const attrs = { name: c.name, classname: file(suiteFile), time: '0.1' };
    if (c.failed) {
      return { $: attrs, 'system-out': [{ _: 'log' }], failure: [{ _: 'boom' }] };
    }
    if (c.skipped) {
      return { $: attrs, 'system-out': [{ _: '' }], skipped: [''] };
    }
    return { $: attrs, 'system-out': [{ _: '' }] };
  });

  const report = {
    testsuites: {
      $: {
        name: 'ftr',
        tests: String(cases.length),
        failures: String(cases.filter((c) => c.failed).length),
        skipped: String(cases.filter((c) => c.skipped).length),
      },
      testsuite: [
        {
          $: {
            name: REPORT_NAME,
            timestamp: '2024-01-01T00:00:00',
            time: '0.1',
            tests: String(cases.length),
            failures: String(cases.filter((c) => c.failed).length),
            skipped: String(cases.filter((c) => c.skipped).length),
          },
          testcase: testcases,
        },
      ],
    },
  };

  return new xml2js.Builder({
    cdata: true,
    xmldec: { version: '1.0', encoding: 'utf-8' },
  }).buildObject(report);
};

const writeReport = (counter: number, xml: string) => {
  const path = getJunitReportPath(ROOT, REPORT_NAME, counter);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, xml, 'utf8');
  return path;
};

const collect = async (): Promise<Array<{ classname: string; name: string; failed: boolean }>> => {
  const out: Array<{ classname: string; name: string; failed: boolean }> = [];
  for (let counter = 0; counter < 10; counter++) {
    const path = getJunitReportPath(ROOT, REPORT_NAME, counter);
    if (!existsSync(path)) continue;
    const parsed = await xml2js.parseStringPromise(readFileSync(path, 'utf8'));
    for (const suite of parsed.testsuites.testsuite ?? []) {
      for (const tc of suite.testcase ?? []) {
        out.push({ classname: tc.$.classname, name: tc.$.name, failed: Boolean(tc.failure) });
      }
    }
  }
  return out;
};

describe('reconcileRetryJunitReports', () => {
  afterEach(() => {
    rmSync(resolve(ROOT, 'target'), { recursive: true, force: true });
  });

  it('drops a retried-and-passed file from the initial report, keeping unrelated files', async () => {
    writeReport(0, buildReport('a.ts', [{ name: 'a1' }, { name: 'a2', failed: true }]));
    // an unrelated file that passed on the first run and was never retried
    const bReport = buildReport('b.ts', [{ name: 'b1' }]);
    // second run only re-ran a.ts and it passed
    writeReport(1, buildReport('a.ts', [{ name: 'a1' }, { name: 'a2' }]));

    // append b.ts to the first report to simulate a single initial report with two files
    const firstPath = getJunitReportPath(ROOT, REPORT_NAME, 0);
    const first = await xml2js.parseStringPromise(readFileSync(firstPath, 'utf8'));
    const bParsed = await xml2js.parseStringPromise(bReport);
    first.testsuites.testsuite.push(bParsed.testsuites.testsuite[0]);
    writeFileSync(
      firstPath,
      new xml2js.Builder({
        cdata: true,
        xmldec: { version: '1.0', encoding: 'utf-8' },
      }).buildObject(first),
      'utf8'
    );

    await reconcileRetryJunitReports({ log, reportName: REPORT_NAME, rootDirectory: ROOT });

    const results = await collect();
    // a.ts appears only once (from the retry report) and passing
    const aCases = results.filter((r) => r.classname === file('a.ts'));
    expect(aCases).toHaveLength(2);
    expect(aCases.every((r) => !r.failed)).toBe(true);
    // b.ts is preserved
    expect(results.filter((r) => r.classname === file('b.ts'))).toHaveLength(1);
  });

  it('keeps the failure when a file fails on every attempt', async () => {
    writeReport(0, buildReport('a.ts', [{ name: 'a1', failed: true }]));
    writeReport(1, buildReport('a.ts', [{ name: 'a1', failed: true }]));

    await reconcileRetryJunitReports({ log, reportName: REPORT_NAME, rootDirectory: ROOT });

    const results = await collect();
    const aCases = results.filter((r) => r.classname === file('a.ts'));
    expect(aCases).toHaveLength(1);
    expect(aCases[0].failed).toBe(true);
  });

  it('deletes an initial report left empty after reconciliation', async () => {
    writeReport(0, buildReport('a.ts', [{ name: 'a1', failed: true }]));
    writeReport(1, buildReport('a.ts', [{ name: 'a1' }]));

    await reconcileRetryJunitReports({ log, reportName: REPORT_NAME, rootDirectory: ROOT });

    expect(existsSync(getJunitReportPath(ROOT, REPORT_NAME, 0))).toBe(false);
    expect(existsSync(getJunitReportPath(ROOT, REPORT_NAME, 1))).toBe(true);
  });

  it('is a no-op when there is only a single report', async () => {
    const path = writeReport(0, buildReport('a.ts', [{ name: 'a1', failed: true }]));
    const before = readFileSync(path, 'utf8');

    await reconcileRetryJunitReports({ log, reportName: REPORT_NAME, rootDirectory: ROOT });

    expect(readFileSync(path, 'utf8')).toBe(before);
  });
});
