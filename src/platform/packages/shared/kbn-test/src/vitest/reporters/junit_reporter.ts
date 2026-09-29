/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dirname, relative } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

import xmlBuilder from 'xmlbuilder';
import type { Reporter, TestModule } from 'vitest/node';
import { REPO_ROOT } from '@kbn/repo-info';

import { escapeCdata } from '../../mocha/xml';
import { getUniqueJunitReportPath } from '../../report_path';
import { prettifyCommandLine } from '../../prettify_command_line';
import { getModuleResults } from './test_module_results';

const REPORT_NAME = 'Vitest Tests';

const msToIso = (ms: number) => new Date(ms).toISOString().slice(0, -5);
const msToSec = (ms: number) => (ms / 1000).toFixed(3);

/**
 * Writes the same JUnit XML as the Kibana Jest reporter so the failed-test reporter and
 * Buildkite annotations keep working.
 */
export class KbnJunitReporter implements Reporter {
  private startTime = Date.now();

  onTestRunStart() {
    this.startTime = Date.now();
  }

  onTestRunEnd(testModules: ReadonlyArray<TestModule>) {
    if (!process.env.CI || process.env.DISABLE_JUNIT_REPORTER || !testModules.length) {
      return;
    }

    const commandLine = prettifyCommandLine(process.argv);
    const suites = testModules.map((testModule) => ({
      testModule,
      ...getModuleResults(testModule),
    }));
    const allCases = suites.flatMap(({ cases }) => cases);

    const root = xmlBuilder.create(
      'testsuites',
      { encoding: 'utf-8' },
      {},
      { keepNullAttributes: false }
    );
    root.att({
      name: 'vitest',
      timestamp: msToIso(this.startTime),
      time: msToSec(Date.now() - this.startTime),
      tests: allCases.length,
      failures:
        allCases.filter(({ status }) => status === 'failed').length +
        suites.filter(({ moduleErrors }) => moduleErrors.length).length,
      skipped: allCases.filter(({ status }) => status === 'skipped').length,
      'command-line': commandLine,
    });

    for (const { testModule, cases, moduleErrors } of suites) {
      const filePath = testModule.moduleId;
      const { duration } = testModule.diagnostic();
      const suiteEl = root.ele('testsuite', {
        name: relative(REPO_ROOT, filePath),
        timestamp: msToIso(cases[0]?.startTime ?? this.startTime),
        time: msToSec(duration),
        tests: cases.length || (moduleErrors.length ? 1 : 0),
        failures: cases.filter(({ status }) => status === 'failed').length || moduleErrors.length,
        skipped: cases.filter(({ status }) => status === 'skipped').length,
        file: filePath,
        'command-line': commandLine,
      });

      const classname = `${REPORT_NAME}.${dirname(relative(REPO_ROOT, filePath)).replace(
        /\./g,
        '·'
      )}`;

      if (moduleErrors.length) {
        // A suite that failed to load has no test cases; report it as one failing case.
        suiteEl
          .ele('testcase', { classname, name: 'Test suite failed to run', time: msToSec(duration) })
          .ele('failure')
          .dat(escapeCdata(moduleErrors.join('\n\n')));
      }

      for (const { suites: ancestors, title, status, durationMs, failureMessages } of cases) {
        const testEl = suiteEl.ele('testcase', {
          classname,
          name: [...ancestors, title].join(' '),
          time: msToSec(durationMs),
        });
        for (const message of failureMessages) {
          testEl.ele('failure').dat(escapeCdata(message));
        }
        if (status === 'skipped') {
          testEl.ele('skipped');
        }
      }
    }

    const reportPath = getUniqueJunitReportPath(REPO_ROOT, REPORT_NAME);
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, root.end(), 'utf8');
  }
}
