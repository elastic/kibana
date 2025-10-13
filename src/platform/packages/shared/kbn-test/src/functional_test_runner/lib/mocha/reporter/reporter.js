/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { format } from 'util';
import Path from 'path';

import Mocha from 'mocha';
import { ToolingLogTextWriter } from '@kbn/tooling-log';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { REPO_ROOT } from '@kbn/repo-info';
import moment from 'moment';
import Table from 'cli-table3';

import { recordLog, snapshotLogsForRunnable, setupJUnitReportGeneration } from '../../../../mocha';
import * as colors from './colors';
import * as symbols from './symbols';
import { ms } from './ms';
import { writeEpilogue } from './write_epilogue';
import { setupCiStatsFtrTestGroupReporter } from './ci_stats_ftr_reporter';
import { ScoutFTRReporter } from './scout_ftr_reporter';

/**
 * Simplify verbose hook titles for better readability
 */
function simplifyHookTitle(hookTitle) {
  // Remove redundant "hook:" text and suite names for cleaner output
  let simplified = hookTitle
    .replace(/^"before all" hook: /, '⚙ Setup: ')
    .replace(/^"before each" hook: /, '→ Before: ')
    .replace(/^"after all" hook: /, '⚙ Teardown: ')
    .replace(/^"after each" hook: /, '← After: ')
    .replace(/^"before all" hook$/, '⚙ Setup')
    .replace(/^"before each" hook$/, '→ Before')
    .replace(/^"after all" hook$/, '⚙ Teardown')
    .replace(/^"after each" hook$/, '← After');

  // Remove the redundant " for <test name>" or " in <suite name>" suffixes
  simplified = simplified.replace(/ for ".*?"$/, '').replace(/ in ".*?"$/, '');

  return simplified;
}

/**
 * Extract the first meaningful error line and the file where it occurred from the stack trace
 */
function extractErrorInfo(errorMessage) {
  const lines = errorMessage.split('\n');

  // Find the first line with "Error:"
  let errorLine = lines.find((line) => line.trim().startsWith('Error:'));
  if (!errorLine) {
    errorLine = lines[0] || 'Unknown error';
  }

  // Clean up the error line (remove leading whitespace and color codes)
  errorLine = errorLine.replace(/^\s+/, '').replace(/\x1b\[\d+m/g, '');

  // Find the first stack frame that's not from node_modules or node internals
  let errorFile = 'Unknown file';
  for (const line of lines) {
    // Match file paths with better regex to capture full paths
    const match = line.match(/at\s+.*?\(?([^\s()]+\.(?:ts|js|tsx|jsx)):\d+:\d+\)?/);
    if (
      match &&
      !line.includes('node_modules') &&
      !line.includes('node:internal') &&
      !line.includes('retry_for_success')
    ) {
      const fullPath = match[1];
      // Convert to path relative to REPO_ROOT
      try {
        errorFile = Path.relative(REPO_ROOT, Path.resolve(fullPath));
      } catch (e) {
        // If path resolution fails, use the matched path as-is
        errorFile = fullPath;
      }
      break;
    }
  }

  return { errorLine, errorFile };
}

/**
 * Create a formatted error summary table
 */
function createErrorSummary(runnable, errorMessage) {
  const testFile = runnable.file || 'Unknown file';
  const testName = runnable.fullTitle();
  const { errorLine, errorFile } = extractErrorInfo(errorMessage);

  // Get path relative to REPO_ROOT
  let relativeTestFile;
  try {
    relativeTestFile = Path.relative(REPO_ROOT, testFile);
  } catch (e) {
    relativeTestFile = testFile;
  }

  const table = new Table({
    style: {
      head: [],
      border: ['red'],
    },
    colWidths: [18, 80],
    wordWrap: true,
  });

  table.push(
    [colors.fail('Test file'), relativeTestFile],
    [colors.fail(`Failing test`), testName],
    [colors.fail('Error'), errorLine],
    [colors.fail('Thrown from'), errorFile]
  );

  return '\n' + table.toString() + '\n';
}

export function MochaReporterProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const lifecycle = getService('lifecycle');
  let originalLogWriters;
  let reporterCaptureStartTime;

  const failuresOverTime = [];

  return class MochaReporter extends Mocha.reporters.Base {
    constructor(runner, options) {
      super(runner, options);
      runner.on('start', this.onStart);
      runner.on('hook', this.onHookStart);
      runner.on('hook end', this.onHookEnd);
      runner.on('test', this.onTestStart);
      runner.on('suite', this.onSuiteStart);
      runner.on('pending', this.onPending);
      runner.on('pass', this.onPass);
      runner.on('fail', this.onFail);
      runner.on('test end', this.onTestEnd);
      runner.on('suite end', this.onSuiteEnd);
      runner.on('end', this.onEnd);

      if (config.get('junit.enabled') && config.get('junit.reportName')) {
        setupJUnitReportGeneration(runner, {
          reportName: config.get('junit.reportName'),
          metadata: config.get('junit.metadata'),
        });
      }

      if (config.get('mochaReporter.sendToCiStats')) {
        const reporter = CiStatsReporter.fromEnv(log);
        if (!reporter.hasBuildConfig()) {
          log.warning('ci-stats reporter config is not available so test results will not be sent');
        } else {
          setupCiStatsFtrTestGroupReporter({
            reporter,
            config,
            lifecycle,
            runner,
          });
        }
      }

      if (config.get('scoutReporter.enabled')) {
        new ScoutFTRReporter(runner, config);
      }
    }

    onStart = () => {
      if (config.get('mochaReporter.captureLogOutput')) {
        log.warning(
          'debug logs are being captured, only error logs will be written to the console'
        );

        reporterCaptureStartTime = moment();
        originalLogWriters = log.getWriters();

        log.setWriters([
          new ToolingLogTextWriter({
            level: 'error',
            ignoreSources: ['ProcRunner', '@kbn/es Cluster'],
            writeTo: process.stdout,
          }),
          new ToolingLogTextWriter({
            level: 'debug',
            writeTo: {
              write: (line) => {
                // if the current runnable is a beforeEach hook then
                // `runner.suite` is set to the suite that defined the
                // hook, rather than the suite executing, so instead we
                // grab the suite from the test, but that's only available
                // when we are doing something test specific, so for global
                // hooks we fallback to `runner.suite`
                const currentSuite = this.runner.test ? this.runner.test.parent : this.runner.suite;

                // We are computing the difference between the time when this
                // reporter has started and the time when each line are being
                // logged in order to be able to label the test results log lines
                // with this relative time information
                const diffTimeSinceStart = moment().diff(reporterCaptureStartTime);
                const readableDiffTimeSinceStart = `[${moment(diffTimeSinceStart).format(
                  'HH:mm:ss'
                )}] `;

                recordLog(currentSuite, `${readableDiffTimeSinceStart} ${line}`);
              },
            },
          }),
        ]);
      }

      log.write('');
    };

    onHookStart = (hook) => {
      const simplifiedTitle = simplifyHookTitle(hook.title);
      log.write(`  ${colors.suite(simplifiedTitle)}`);
      log.indent(2);
    };

    onHookEnd = () => {
      log.indent(-2);
    };

    onSuiteStart = (suite) => {
      if (!suite.root) {
        log.write(`${colors.suite('▶')} ${colors.suite(suite.title)}`);
      }

      log.indent(2);
    };

    onSuiteEnd = () => {
      if (log.indent(-2) === 0) {
        log.write('');
      }
    };

    onTestStart = (test) => {
      log.write(`  ○ ${test.title}`);
      log.indent(2);
    };

    onTestEnd = (test) => {
      snapshotLogsForRunnable(test);
      log.indent(-2);
    };

    onPending = (test) => {
      log.write(`  ${colors.pending('○ ' + test.title)}`);
      log.indent(2);
    };

    onPass = (test) => {
      const time = colors.speed(test.speed, ` (${ms(test.duration)})`);
      const pass = colors.pass(`${symbols.ok} pass`);
      log.write(`    ${pass} ${time}`);
    };

    onFail = (runnable) => {
      // NOTE: this is super gross
      //
      //  - I started by trying to extract the Base.list() logic from mocha
      //    but it's a lot more complicated than this is horrible.
      //  - In order to fix the numbering and indentation we monkey-patch
      //    Mocha.reporters.Base.consoleLog and parse the logged output.
      //
      let output = '';
      const realLog = Mocha.reporters.Base.consoleLog;
      Mocha.reporters.Base.consoleLog = (...args) => (output += `${format(...args)}\n`);
      try {
        Mocha.reporters.Base.list([runnable]);
      } finally {
        Mocha.reporters.Base.consoleLog = realLog;
      }

      const outputLines = output.split('\n');

      const errorMarkerStart = outputLines.reduce((index, line, i) => {
        if (index >= 0) {
          return index;
        }
        return /Error:/.test(line) ? i : index;
      }, -1);

      const errorMessage = outputLines
        // drop the first ${errorMarkerStart} lines, (empty + test title)
        .slice(errorMarkerStart)
        // move leading colors behind leading spaces
        .map((line) => line.replace(/^((?:\[.+m)+)(\s+)/, '$2$1'))
        .map((line) => ` ${line}`)
        .join('\n');

      // Create a cleaner error summary table
      const errorSummary = createErrorSummary(runnable, errorMessage);

      log.write(
        `    ${colors.fail(`${symbols.err} fail`)}` +
          errorSummary +
          '\n' +
          colors.fail('Full Error Details:') +
          '\n' +
          errorMessage
      );

      // Prefer to reuse the nice Mocha nested title format for final summary
      const nestedTitleFormat = outputLines
        .slice(1, errorMarkerStart)
        .join('\n')
        // make sure to remove the list number
        .replace(/\d+\)/, '');

      failuresOverTime.push({
        title: nestedTitleFormat,
        error: `"${errorMessage}"`,
      });

      // failed hooks trigger the `onFail(runnable)` callback, so we snapshot the logs for
      // them here. Tests will re-capture the snapshot in `onTestEnd()`
      snapshotLogsForRunnable(runnable);
    };

    onEnd = () => {
      if (originalLogWriters) {
        log.setWriters(originalLogWriters);
      }

      writeEpilogue(log, this.stats, failuresOverTime);
    };
  };
}
