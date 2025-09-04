/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { BaseReporter } = require('@jest/reporters');

/**
 * Custom Jest reporter that only adds slow test information and warnings
 * without duplicating the default Jest output
 */
class SlowTestReporter extends BaseReporter {
  constructor(globalConfig, options = {}) {
    super(globalConfig, options);
    this._options = {
      warnOnSlowerThan: 300,
      color: true,
      ...options,
    };
    this._slowTests = [];
  }

  onTestResult(test, testResult) {
    // Collect slow tests for end summary
    for (let i = 0; i < testResult.testResults.length; i++) {
      const result = testResult.testResults[i];

      if (this._options.warnOnSlowerThan && result.duration > this._options.warnOnSlowerThan) {
        this._slowTests.push({
          duration: result.duration,
          fullName: result.fullName,
          filePath: testResult.testFilePath,
        });
      }
    }
  }

  onRunComplete(contexts, results) {
    // Show slow test warnings as end summary
    if (this._slowTests.length === 0) {
      return;
    }

    this.log(''); // Empty line for spacing

    // Sort tests by duration (slowest first)
    this._slowTests.sort((a, b) => b.duration - a.duration);

    const rootPathRegex = new RegExp(`^${process.cwd()}`);
    const warningTitle = `⚠️  Found ${this._slowTests.length} slow test${
      this._slowTests.length > 1 ? 's' : ''
    } (>${this._options.warnOnSlowerThan}ms):`;
    const coloredWarningTitle = this._options.color
      ? `\x1b[33m${warningTitle}\x1b[0m`
      : warningTitle;

    this.log(coloredWarningTitle);

    this._slowTests.forEach((test) => {
      const duration = test.duration;
      const filePath = test.filePath.replace(rootPathRegex, '.');
      
      const durationLabel = this._options.color 
        ? `\x1b[41m\x1b[37m ${this._formatDuration(duration)} \x1b[0m`
        : ` ${this._formatDuration(duration)} `;

      const testInfo = this._options.color
        ? `  • \x1b[37m${test.fullName}\x1b[0m`
        : `  • ${test.fullName}`;
      
      const fileInfo = `    ${filePath} ${durationLabel}`;
      
      this.log(testInfo);
      this.log(fileInfo);
    });

    this.log(''); // Empty line for spacing
  }

  _formatDuration(ms) {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  }
}

module.exports = SlowTestReporter;
