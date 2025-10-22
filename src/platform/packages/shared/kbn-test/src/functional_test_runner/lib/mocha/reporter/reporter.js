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
import stripAnsi from 'strip-ansi';

import Mocha from 'mocha';
import { ToolingLogTextWriter } from '@kbn/tooling-log';
import { CiStatsReporter } from '@kbn/ci-stats-reporter';
import { REPO_ROOT } from '@kbn/repo-info';
import moment from 'moment';

import { recordLog, snapshotLogsForRunnable, setupJUnitReportGeneration } from '../../../../mocha';
import * as colors from './colors';
import * as symbols from './symbols';
import { ms } from './ms';
import { writeEpilogue } from './write_epilogue';
import { setupCiStatsFtrTestGroupReporter } from './ci_stats_ftr_reporter';
import { ScoutFTRReporter } from './scout_ftr_reporter';

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

      // Progress tracking
      this.totalTests = 0;
      this.completedTests = 0;
      this.testTimings = [];
      this.currentTest = null;
      this.logIndentLevel = 0;

      // Store reference to reporter instance for log wrapper
      this.runner = runner;

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
      // Count total tests
      this.totalTests = this.runner.suite.total();
      log.write(colors.progress(`Starting ${this.totalTests} tests...`));

      // Wrap log writers to add indentation only to external logs
      const originalWriters = log.getWriters();
      const wrappedWriters = originalWriters.map((writer) => ({
        ...writer,
        write: (msg) => {
          // Only indent external logs (those with source labels)
          if (this.logIndentLevel > 0 && msg.args && msg.args.length > 0) {
            const firstArg = String(msg.args[0]);
            const cleanFirstArg = stripAnsi(firstArg);
            // Check if this is an external log (starts with [Source])
            if (cleanFirstArg.match(/^\[(?:Kibana|Browser|Test Data|Test Cleanup|ES|FTR)\]/)) {
              const indent = ' '.repeat(this.logIndentLevel);
              const lines = firstArg.split('\n');
              const indentedFirstArg = lines
                .map((line) =>
                  // Only indent if line is not empty
                  line.trim() ? indent + line : line
                )
                .join('\n');
              writer.write({
                ...msg,
                args: [indentedFirstArg, ...msg.args.slice(1)],
              });
              return;
            }
          }
          // Not an external log, write as-is
          writer.write(msg);
        },
      }));
      log.setWriters(wrappedWriters);

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
      // Show hook header with location
      const hookTitle = hook.title.replace(/^"(before|after)( each| all)?" hook/, '$1$2 hook');
      const filePath = hook.file ? colors.gray(`(${Path.relative(REPO_ROOT, hook.file)})`) : '';

      // Indent hooks under test if a test is running, otherwise at suite level
      const indent = this.currentTest ? '      ' : '  ';
      log.write(`${indent}${colors.gray(hookTitle)} ${filePath}`);
    };

    onHookEnd = () => {
      // No-op - hook header already shown
    };

    onSuiteStart = (suite) => {
      if (!suite.root) {
        // Get the file path relative to REPO_ROOT
        const filePath = suite.file ? Path.relative(REPO_ROOT, suite.file) : '';
        const fileInfo = filePath ? colors.gray(` (${filePath})`) : '';

        log.write('');
        log.write(colors.suite(suite.title) + fileInfo);

        // Set indent for suite-level logs (e.g., before all hooks)
        this.logIndentLevel = 2;
      }
    };

    onSuiteEnd = () => {
      // No-op
    };

    onTestStart = (test) => {
      this.currentTest = test;
      const filePath = test.file ? Path.relative(REPO_ROOT, test.file) : '';
      const lineNumber = test.line ? `:L${test.line}` : '';
      const fileInfo = filePath ? colors.gray(` (${filePath}${lineNumber})`) : '';
      log.write(`    ${colors.suite(test.title)}${fileInfo}`);

      // Set indent for test-level logs
      this.logIndentLevel = 6;
    };

    onTestEnd = (test) => {
      snapshotLogsForRunnable(test);

      // Track progress and timings
      this.completedTests++;

      this.testTimings.push({
        title: test.fullTitle(),
        duration: test.duration || 0,
      });

      // Display progress and add separation after each test
      log.write(colors.progress(`    Progress: ${this.completedTests}/${this.totalTests} tests`));
      log.write('');

      this.currentTest = null;
      // Reset indent back to suite level
      this.logIndentLevel = 2;
    };

    onPending = (test) => {
      this.currentTest = test;
      const filePath = test.file ? Path.relative(REPO_ROOT, test.file) : '';
      const lineNumber = test.line ? `:L${test.line}` : '';
      const fileInfo = filePath ? colors.gray(` (${filePath}${lineNumber})`) : '';
      log.write(`    ${test.title}${fileInfo}`);
      log.write(colors.pending(`      skipped`));
    };

    onPass = (test) => {
      const time = colors.speed(test.speed, ` (${ms(test.duration)})`);
      const pass = colors.pass(`${symbols.ok} pass`);
      log.write(`      ${pass} ${time}`);
    };

    onFail = (runnable) => {
      // NOTE: this is super gross
      //
      //  - I started by trying to extract the Base.list() logic from mocha
      //    but it's a lot more complicated than this is horrible.
      //  - In order to fix the numbering and indentation we monkey-patch
      //    Mocha.reporters.Base.consoleLog and parse the logged output.
      //
      const time = colors.speed(runnable.speed, ` (${ms(runnable.duration)})`);
      const fail = colors.fail(`${symbols.err} fail`);
      log.write(`      ${fail} ${time}`);

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
        .map((line) => `        ${line}`)
        .join('\n');

      // Flush buffered browser logs on failure
      if (lifecycle.browserLogBuffer) {
        lifecycle.browserLogBuffer.flush();
      }

      log.write(errorMessage);

      // Prefer to reuse the nice Mocha nested title format for final summary
      const nestedTitleFormat = outputLines
        .slice(1, errorMarkerStart)
        .join('\n')
        // make sure to remove the list number
        .replace(/\d+\)/, '');

      failuresOverTime.push({
        title: nestedTitleFormat,
        error: errorMessage,
      });

      // failed hooks trigger the `onFail(runnable)` callback, so we snapshot the logs for
      // them here. Tests will re-capture the snapshot in `onTestEnd()`
      snapshotLogsForRunnable(runnable);
    };

    onEnd = () => {
      if (originalLogWriters) {
        log.setWriters(originalLogWriters);
      }

      // Display slowest tests summary
      if (this.testTimings.length > 0) {
        const slowestTests = this.testTimings.sort((a, b) => b.duration - a.duration).slice(0, 10);

        log.write('');
        log.write(colors.suite('Slowest tests:'));
        slowestTests.forEach((test, index) => {
          const duration = ms(test.duration);
          const formattedDuration = colors.speed('slow', '(' + duration + ')');
          log.write(`  ${index + 1}. ${test.title} ${formattedDuration}`);
        });
        log.write('');
      }

      writeEpilogue(log, this.stats, failuresOverTime);
    };
  };
}
