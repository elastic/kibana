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
      const fileName = hook.file ? Path.relative(REPO_ROOT, hook.file) : '';
      log.write(
        `  ${colors.suite(simplifiedTitle)} ${fileName ? colors.subdued(`(${fileName})`) : ''}`
      );
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
      const fileName = test.file ? Path.relative(REPO_ROOT, test.file) : '';
      log.write(
        `  ○ ${colors.suite(test.title)} ${fileName ? colors.subdued(`(${fileName})`) : ''}`
      );
      log.indent(2);
    };

    onTestEnd = (test) => {
      snapshotLogsForRunnable(test);
      log.indent(-2);
    };

    onPending = (test) => {
      const fileName = test.file ? Path.relative(REPO_ROOT, test.file) : '';
      log.write(
        `  ${colors.pending('○ ' + test.title)} ${fileName ? colors.subdued(`(${fileName})`) : ''}`
      );
      log.indent(2);
    };

    onPass = (test) => {
      const time = colors.speed(test.speed, ` (${ms(test.duration)})`);
      const pass = colors.pass(`${symbols.ok} pass`);
      const progress = this.getProgressIndicator();
      log.write(`    ${pass} ${time} ${progress}`);
    };

    onFail = (runnable, err) => {
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

      const location = this.extractLocation(err.stack, runnable.file);

      const errorSummary = createErrorSummary(runnable, errorMessage, location);
      const progress = runnable.type === 'test' ? ` ${this.getProgressIndicator()}` : '';

      log.write(
        `    
    ${colors.fail(`${symbols.err} fail`)}${progress}
    ${errorSummary}

    ${colors.fail('Full Error Details:')}

    ${errorMessage}
        `
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

    getProgressIndicator = () => {
      const completed = (this.stats.passes || 0) + (this.stats.failures || 0);
      const total = this.runner.total || 0;
      const remaining = total - completed;

      if (total === 0) {
        return '';
      }

      const percentage = Math.round((completed / total) * 100);
      return colors.suite(`[${completed}/${total} (${percentage}%), ${remaining} remaining]`);
    };

    extractLocation(stack, testFile) {
      if (!stack || !testFile) return null;

      const lines = stack.split('\n');
      const testFileName = Path.basename(testFile);

      let bestMatch = null;

      for (const line of lines) {
        // Match patterns like: at Context.<anonymous> (infrastructure_security.ts:67:29)
        const match = line.match(/\(([^)]+):(\d+):(\d+)\)/);

        if (match) {
          const file = match[1].trim();
          const lineNum = match[2];
          const col = match[3];

          // Check if this line is from the test file (match by filename or full path)
          if (
            !file.includes('node_modules') &&
            !file.includes('node:internal') &&
            (file.endsWith(testFileName) || testFile.endsWith(file))
          ) {
            const location = {
              file: testFile,
              line: lineNum,
              column: col,
            };

            // Prioritize Context.<anonymous> (the actual test) or return first match
            if (line.includes('Context.<anonymous>') || line.includes('Context.it')) {
              return location;
            }

            // Store first match as fallback
            if (!bestMatch) {
              bestMatch = location;
            }
          }
        }
      }

      return bestMatch;
    }
  };
}

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
  const match = errorMessage.match(/Error:[\s\S]*?(?=\n\s+at )/);
  const message = match ? match[0] : errorMessage;
  const errorLine = message.replace(/\s+/g, ' ').trim();

  // Find the first stack frame that's not from node_modules or node internals
  const lines = errorMessage.split('\n');
  let errorFile = 'Unknown file';
  for (const line of lines) {
    // Match file paths with line and column numbers
    const match = line.match(/at\s+.*?\(?([^\s()]+\.(?:ts|js|tsx|jsx)):(\d+):(\d+)\)?/);
    if (
      match &&
      !line.includes('node_modules') &&
      !line.includes('node:internal') &&
      !line.includes('retry_for_success')
    ) {
      const fullPath = match[1];
      const lineNum = match[2];
      const colNum = match[3];

      // Convert to path relative to REPO_ROOT
      try {
        const relativePath = Path.relative(REPO_ROOT, Path.resolve(fullPath));
        errorFile = `${relativePath}:${lineNum}:${colNum}`;
      } catch (e) {
        // If path resolution fails, use the matched path as-is
        errorFile = `${fullPath}:${lineNum}:${colNum}`;
      }
      break;
    }
  }

  return { errorLine, errorFile };
}

/**
 * Format a long string to fit within a specified width
 */
function formatLongString(str, width) {
  const arr = str.split(' ');

  return arr.reduce((acc, curr) => {
    if (curr.length > width) {
      return acc + curr.slice(0, width) + '\n' + curr.slice(width);
    }
    return acc + curr + ' ';
  }, '');
}

/**
 * Wrap text to fit within a specified width
 */
function wrapText(text = '', width) {
  const arr = text.split('\n');

  return arr.reduce((acc, curr) => {
    if (curr.length > width) {
      return acc + formatLongString(curr, width) + '\n';
    }
    return acc + curr.trim();
  }, '');
}

/**
 * Get the root suite (config) name with file path
 */
function getRootSuite(runnable) {
  let current = runnable;
  let rootTitle = '';

  // Walk up to find the root suite
  while (current.parent) {
    if (current.title && !current.parent.parent) {
      // This is a top-level suite (likely the config/describe block)
      rootTitle = current.title;
    }
    current = current.parent;
  }

  const suiteName = rootTitle || 'Unknown config';
  const configFile = runnable.file || '';
  const relativeConfigFile = configFile ? Path.relative(REPO_ROOT, configFile) : '';

  return {
    suiteName,
    relativeConfigFile,
  };
}

/**
 * Format the test hierarchy with better visual separation
 */
function formatTestHierarchy(runnable) {
  const titles = [];
  let current = runnable;
  let skipFirst = true; // Skip the root suite since we show it separately as "Config"

  // Walk up the suite hierarchy
  while (current.parent) {
    if (current.title) {
      // Skip the root suite (first level)
      if (skipFirst && !current.parent.parent) {
        skipFirst = false;
      } else {
        titles.unshift(current.title);
      }
    }
    current = current.parent;
  }

  // Join with visual separator for better readability
  return titles.join(' › ');
}

/**
 * Format the test file location with line and column numbers
 */
function formatTestLocation(runnable, extractedLocation = null) {
  const testFile = runnable.file || 'Unknown file';
  const relativeTestFile = Path.relative(REPO_ROOT, testFile);

  // Use extracted location from error stack if available
  if (extractedLocation && extractedLocation.line) {
    const locationFile = Path.relative(REPO_ROOT, extractedLocation.file);
    if (extractedLocation.column) {
      return `${locationFile}:${extractedLocation.line}:${extractedLocation.column}`;
    }
    return `${locationFile}:${extractedLocation.line}`;
  }

  // Fallback to runnable properties if available
  if (runnable.line && runnable.column) {
    return `${relativeTestFile}:${runnable.line}:${runnable.column}`;
  } else if (runnable.line) {
    return `${relativeTestFile}:${runnable.line}`;
  }

  return relativeTestFile;
}

/**
 * Create a formatted error summary table
 */
function createErrorSummary(runnable, errorMessage, extractedLocation = null) {
  const VALUE_WIDTH = 140;

  const { relativeConfigFile, suiteName } = getRootSuite(runnable);
  const testName = formatTestHierarchy(runnable);
  const testLocation = formatTestLocation(runnable, extractedLocation);
  const { errorLine, errorFile } = extractErrorInfo(errorMessage);

  const table = new Table({
    style: {
      head: [],
      border: ['red'],
    },
    colWidths: [14, VALUE_WIDTH],
    wordWrap: true,
    wrapOnWordBoundary: true,
  });

  table.push(
    ...[
      {
        label: 'Config',
        value: [colors.suite(suiteName), colors.subdued(relativeConfigFile)],
      },
      {
        label: 'Failing test',
        value: [colors.suite(testName), colors.subdued(testLocation)],
      },
      {
        label: 'Error',
        value: [errorLine],
      },
      {
        label: 'Thrown from',
        value: [errorFile],
      },
    ].map((row) => [
      colors.fail(row.label),
      row.value.map((val) => wrapText(val, VALUE_WIDTH - 2)).join('\n'),
    ])
  );

  return '\n' + table.toString() + '\n';
}
