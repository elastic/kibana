/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '@kbn/utils';
import { dirname, relative } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { inspect } from 'util';

import xmlBuilder from 'xmlbuilder';
import { getUniqueJunitReportPath } from '../report_path';

import { getSnapshotOfRunnableLogs } from './log_cache';
import { escapeCdata } from '..';

const dateNow = Date.now.bind(Date);

export function setupJUnitReportGeneration(runner, options = {}) {
  const {
    reportName = 'Unnamed Mocha Tests',
    rootDirectory = REPO_ROOT,
    getTestMetadata = () => ({}),
  } = options;

  const stats = {};
  const results = [];

  const getDuration = (node) =>
    node.startTime && node.endTime ? ((node.endTime - node.startTime) / 1000).toFixed(3) : null;

  const findAllTests = (suite) =>
    suite.suites.reduce((acc, suite) => acc.concat(findAllTests(suite)), suite.tests);

  const setStartTime = (node) => {
    node.startTime = dateNow();
  };

  const setEndTime = (node) => {
    node.endTime = dateNow();
  };

  const getFullTitle = (node) => {
    const parentTitle = node.parent && getFullTitle(node.parent);
    return parentTitle ? `${parentTitle} ${node.title}` : node.title;
  };

  const getPath = (node) => {
    if (node.file) {
      return relative(rootDirectory, node.file);
    }

    if (node.parent) {
      return getPath(node.parent);
    }

    return 'unknown';
  };

  runner.on('start', () => setStartTime(stats));
  runner.on('suite', setStartTime);
  runner.on('hook', setStartTime);
  runner.on('hook end', setEndTime);
  runner.on('test', setStartTime);
  runner.on('pass', (node) => results.push({ node }));
  runner.on('pass', setEndTime);
  runner.on('fail', (node, error) => results.push({ failed: true, error, node }));
  runner.on('fail', setEndTime);
  runner.on('suite end', () => setEndTime(stats));

  runner.on('end', () => {
    // crawl the test graph to collect all defined tests
    const allTests = findAllTests(runner.suite);
    if (!allTests.length) {
      return;
    }

    // filter out just the failures
    const failures = results.filter((result) => result.failed);

    // any failure that isn't for a test is for a hook
    const failedHooks = failures.filter((result) => !allTests.includes(result.node));

    // mocha doesn't emit 'pass' or 'fail' when it skips a test
    // or a test is pending, so we find them ourselves
    const skippedResults = allTests
      .filter((node) => node.pending || !results.find((result) => result.node === node))
      .map((node) => ({ skipped: true, node }));

    const builder = xmlBuilder.create(
      'testsuites',
      { encoding: 'utf-8' },
      {},
      { skipNullAttributes: true }
    );

    const testsuitesEl = builder.ele('testsuite', {
      name: reportName,
      timestamp: new Date(stats.startTime).toISOString().slice(0, -5),
      time: getDuration(stats),
      tests: allTests.length + failedHooks.length,
      failures: failures.length,
      skipped: skippedResults.length,
    });

    function addTestcaseEl(node) {
      return testsuitesEl.ele('testcase', {
        name: getFullTitle(node),
        classname: `${reportName}.${getPath(node).replace(/\./g, '·')}`,
        time: getDuration(node),
        'metadata-json': JSON.stringify(getTestMetadata(node) || {}),
      });
    }

    [...results, ...skippedResults].forEach((result) => {
      const el = addTestcaseEl(result.node);

      if (result.failed) {
        el.ele('system-out').dat(escapeCdata(getSnapshotOfRunnableLogs(result.node) || ''));
        el.ele('failure').dat(escapeCdata(inspect(result.error)));
        return;
      }

      el.ele('system-out').dat('-- logs are only reported for failed tests --');

      if (result.skipped) {
        el.ele('skipped');
      }
    });

    const reportPath = getUniqueJunitReportPath(rootDirectory, reportName);
    const reportXML = builder.end();
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, reportXML, 'utf8');
  });
}
