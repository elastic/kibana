/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import { promisify } from 'util';

import xml2js from 'xml2js';
import type { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';

import { getJunitReportPath } from '../report_path';

const readAsync = promisify(Fs.readFile);
const writeAsync = promisify(Fs.writeFile);
const unlinkAsync = promisify(Fs.unlink);

interface TestCase {
  $: { name: string; classname: string; [attr: string]: string };
  failure?: unknown[];
  skipped?: unknown[];
}

interface TestSuite {
  $: Record<string, string>;
  testcase?: TestCase[];
}

interface ParsedReport {
  testsuites?: { $?: Record<string, string>; testsuite: TestSuite[] };
  testsuite?: TestSuite;
}

const getSuites = (report: ParsedReport): TestSuite[] => {
  if (report.testsuites) {
    return report.testsuites.testsuite ?? [];
  }
  return report.testsuite ? [report.testsuite] : [];
};

const countTestcases = (report: ParsedReport): number =>
  getSuites(report).reduce((acc, suite) => acc + (suite.testcase?.length ?? 0), 0);

const recomputeCounts = (report: ParsedReport): void => {
  let tests = 0;
  let failures = 0;
  let skipped = 0;

  for (const suite of getSuites(report)) {
    const testcases = suite.testcase ?? [];
    const suiteFailures = testcases.filter((tc) => tc.failure).length;
    const suiteSkipped = testcases.filter((tc) => tc.skipped).length;

    suite.$.tests = String(testcases.length);
    suite.$.failures = String(suiteFailures);
    suite.$.skipped = String(suiteSkipped);

    tests += testcases.length;
    failures += suiteFailures;
    skipped += suiteSkipped;
  }

  if (report.testsuites?.$) {
    report.testsuites.$.tests = String(tests);
    report.testsuites.$.failures = String(failures);
    report.testsuites.$.skipped = String(skipped);
  }
};

/**
 * Enumerate the JUnit reports that belong to a single reportName "family". The
 * runner writes `report`, `report-1`, `report-2`, ... using an incrementing
 * counter (see `getUniqueJunitReportPath`), so the files are contiguous and
 * ordered chronologically.
 */
const listReportFamily = (rootDirectory: string, reportName: string): string[] => {
  const paths: string[] = [];
  for (let counter = 0; ; counter++) {
    const path = getJunitReportPath(rootDirectory, reportName, counter);
    if (!Fs.existsSync(path)) {
      break;
    }
    paths.push(path);
  }
  return paths;
};

/**
 * When FTR retries failed test files, each run writes its own JUnit report
 * (`report`, `report-1`, ...). A retry re-runs the *entire* failing test file,
 * so the newest report for that file supersedes every earlier one. Left as-is,
 * CI failure aggregation scans all reports and still counts the original
 * failure even after a retry passed.
 *
 * This reconciles the family of reports so each test file is represented only
 * by its most recent run: stale entries are dropped from earlier reports (keyed
 * by `classname`, which encodes the test file), suite counts are recomputed,
 * and reports left empty are deleted.
 */
export async function reconcileRetryJunitReports(options: {
  log: ToolingLog;
  reportName: string;
  rootDirectory?: string;
}): Promise<void> {
  const { log, reportName, rootDirectory = REPO_ROOT } = options;

  const reportPaths = listReportFamily(rootDirectory, reportName);
  if (reportPaths.length < 2) {
    return;
  }

  const reports: Array<{ path: string; report: ParsedReport }> = [];
  for (const path of reportPaths) {
    reports.push({ path, report: await xml2js.parseStringPromise(await readAsync(path, 'utf8')) });
  }

  const builder = new xml2js.Builder({
    cdata: true,
    xmldec: { version: '1.0', encoding: 'utf-8' },
  });

  // Walk newest -> oldest. A test file (classname) seen in a newer report is
  // authoritative, so drop its entries from older reports.
  const seenFiles = new Set<string>();
  for (let i = reports.length - 1; i >= 0; i--) {
    const { report } = reports[i];

    for (const suite of getSuites(report)) {
      suite.testcase = (suite.testcase ?? []).filter((tc) => !seenFiles.has(tc.$.classname));
    }

    for (const suite of getSuites(report)) {
      for (const tc of suite.testcase ?? []) {
        seenFiles.add(tc.$.classname);
      }
    }
  }

  for (const { path, report } of reports) {
    if (countTestcases(report) === 0) {
      await unlinkAsync(path);
      log.debug(`[retry] removed superseded JUnit report ${path}`);
      continue;
    }

    recomputeCounts(report);
    const xml = builder
      .buildObject(report)
      .split('\n')
      .map((line) => (line.trim() === '' ? '' : line))
      .join('\n');
    await writeAsync(path, xml, 'utf8');
  }
}
