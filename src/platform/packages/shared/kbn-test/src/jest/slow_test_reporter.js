/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { BaseReporter } = require('@jest/reporters');

const COLORS = {
  YELLOW: '\x1b[33m',
  WHITE: '\x1b[37m',
  GREY: '\x1b[90m',
  BOLD_WHITE: '\x1b[1m\x1b[37m',
  RED_BG: '\x1b[41m',
  RESET: '\x1b[0m',
};

const DEFAULTS = {
  WARN_THRESHOLD: 300,
  MAX_TESTS_SHOWN: 10,
  CI_MULTIPLIER: 3.5, // Realistic CI slowdown factor
};

// Context-aware thresholds for different test types (LOCAL development values)
const TEST_THRESHOLDS = {
  ENZYME_STYLE: 100, // Mocked, shallow renders
  RTL: 300, // Full renders
  INTEGRATION: 500, // Cross-component interactions
  DEFAULT: 300, // Fallback threshold
};

/**
 * Custom Jest reporter that only adds slow test information and warnings
 * without duplicating the default Jest output
 */
class SlowTestReporter extends BaseReporter {
  constructor(globalConfig, options = {}) {
    super(globalConfig, options);
    this._options = {
      warnOnSlowerThan: DEFAULTS.WARN_THRESHOLD,
      color: true,
      ...options,
    };
    this._slowTests = [];
    this._isCI = Boolean(process.env.CI);
    this._isProfiling = Boolean(process.env.JEST_PROFILING);
    this._isColdCache = !globalConfig.watch && !globalConfig.watchman;
  }

  onTestResult(test, testResult) {
    const slowTests = testResult.testResults
      .filter((result) => this._isTestSlow(result, testResult.testFilePath))
      .map((result) => ({
        duration: result.duration,
        fullName: result.fullName,
        filePath: testResult.testFilePath,
        testType: this._detectTestType(result, testResult.testFilePath),
        threshold: this._getThresholdForTest(result, testResult.testFilePath),
      }));

    this._slowTests.push(...slowTests);
  }

  onRunComplete() {
    if (this._slowTests.length === 0) return;

    this.log('');
    this._logWarningTitle();
    this._logContextWarnings();
    this._logSlowTests();
    this.log('');
  }

  _logWarningTitle() {
    const count = this._slowTests.length;
    const plural = count > 1 ? 's' : '';
    const modeText = this._isProfiling ? ' [PROFILING MODE]' : '';
    const title = `⚠️  Found ${count} slow test${plural} with context-aware thresholds${modeText}:`;

    this.log(this._colorText(title, `${COLORS.YELLOW}\x1b[1m`));
  }

  _logSlowTests() {
    const sortedTests = [...this._slowTests].sort((a, b) => b.duration - a.duration);
    const testsToShow = sortedTests.slice(0, DEFAULTS.MAX_TESTS_SHOWN);

    testsToShow.forEach((test) => this._logSlowTest(test));

    const remainingCount = this._slowTests.length - DEFAULTS.MAX_TESTS_SHOWN;
    if (remainingCount > 0) {
      const message = `  ... and ${remainingCount} others`;
      this.log(this._colorText(message, COLORS.GREY));
    }
  }

  _logSlowTest(test) {
    const filePath = this._getRelativePath(test.filePath);
    const testInfo = this._colorText(`  • ${test.fullName}`, COLORS.WHITE);
    const durationLabel = this._formatDurationLabel(test.duration);
    const styledFilePath = this._formatFilePath(filePath);

    this.log(testInfo);
    this.log(`    ${styledFilePath} ${durationLabel}`);
  }

  _formatFilePath(filePath) {
    if (!this._options.color) return filePath;

    const lastSlashIndex = filePath.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      // No directory, just filename - make it bold white
      return `${COLORS.BOLD_WHITE}${filePath}${COLORS.RESET}`;
    }

    const directory = filePath.substring(0, lastSlashIndex + 1);
    const filename = filePath.substring(lastSlashIndex + 1);

    return `${COLORS.GREY}${directory}${COLORS.RESET}${COLORS.BOLD_WHITE}${filename}${COLORS.RESET}`;
  }

  _formatDurationLabel(duration) {
    const formatted = this._formatDuration(duration);
    return this._options.color
      ? `(${COLORS.RED_BG}${COLORS.BOLD_WHITE}${formatted}${COLORS.RESET})`
      : `(${formatted})`;
  }

  _getRelativePath(fullPath) {
    return fullPath.replace(new RegExp(`^${process.cwd()}`), '.');
  }

  _colorText(text, color) {
    return this._options.color ? `${color}${text}${COLORS.RESET}` : text;
  }

  _formatDuration(ms) {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)} s`;
    }
    return `${ms} ms`;
  }

  _detectTestType(result, filePath) {
    const testContent = result.fullName.toLowerCase();
    const fileName = filePath.toLowerCase();

    // Check for integration test patterns
    if (fileName.includes('integration') || testContent.includes('integration')) {
      return 'INTEGRATION';
    }

    // Check for Enzyme patterns
    if (
      testContent.includes('shallow') ||
      testContent.includes('mount') ||
      fileName.includes('enzyme') ||
      testContent.includes('wrapper')
    ) {
      return 'ENZYME_STYLE';
    }

    // Check for RTL patterns (covers RTL testing approaches)
    if (
      testContent.includes('render') ||
      testContent.includes('screen') ||
      fileName.includes('rtl') ||
      testContent.includes('getby') ||
      testContent.includes('click') ||
      testContent.includes('type') ||
      testContent.includes('submit') ||
      testContent.includes('user')
    ) {
      return 'RTL';
    }

    return 'DEFAULT';
  }

  _getThresholdForTest(result, filePath) {
    const testType = this._detectTestType(result, filePath);
    let baseThreshold = TEST_THRESHOLDS[testType] || TEST_THRESHOLDS.DEFAULT;

    // Apply CI multiplier if in CI environment
    if (this._isCI) {
      baseThreshold = Math.round(baseThreshold * DEFAULTS.CI_MULTIPLIER);
    }

    return baseThreshold;
  }

  _isTestSlow(result, filePath) {
    const threshold = this._getThresholdForTest(result, filePath);
    return result.duration > threshold;
  }

  _logContextWarnings() {
    const warnings = [];

    if (this._isProfiling) {
      warnings.push('🔍 PROFILING MODE: Running with cold cache and CI-optimized thresholds');
    } else if (!this._isColdCache) {
      warnings.push('⚠️  Running with warm cache - results may not reflect CI performance');
    }

    if (this._isCI && !this._isProfiling) {
      warnings.push(
        `ℹ️  CI environment detected - thresholds adjusted by ${DEFAULTS.CI_MULTIPLIER}x`
      );
    }

    // Show threshold breakdown for profiling mode
    if (this._isProfiling) {
      const multiplier = this._isCI ? DEFAULTS.CI_MULTIPLIER : 1;
      warnings.push(
        `📊 Thresholds: Enzyme(${Math.round(
          TEST_THRESHOLDS.ENZYME_STYLE * multiplier
        )}ms) RTL(${Math.round(TEST_THRESHOLDS.RTL * multiplier)}ms) Integration(${Math.round(
          TEST_THRESHOLDS.INTEGRATION * multiplier
        )}ms) Default(${Math.round(TEST_THRESHOLDS.DEFAULT * multiplier)}ms)`
      );
    }

    warnings.forEach((warning) => {
      this.log(this._colorText(`  ${warning}`, COLORS.YELLOW));
    });

    if (warnings.length > 0) {
      this.log('');
    }
  }
}

module.exports = SlowTestReporter;
