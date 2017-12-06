import { resolve, dirname, relative } from 'path';
import { writeFileSync } from 'fs';

import mkdirp from 'mkdirp';
import xmlBuilder from 'xmlbuilder';

const ROOT_DIR = dirname(require.resolve('../../../package.json'));

/**
 * Jest reporter that produces JUnit report when running on CI
 * @class JestJunitReporter
 */
export default class JestJunitReporter {
  constructor(globalConfig, options = {}) {
    const {
      reportName = 'Jest Tests',
      rootDirectory = ROOT_DIR
    } = options;

    this._reportName = reportName;
    this._rootDirectory = rootDirectory;
  }

  /**
   * Called by jest when all tests complete
   * @param {Object} contexts
   * @param {JestResults} results see https://facebook.github.io/jest/docs/en/configuration.html#testresultsprocessor-string
   * @return {undefined}
   */
  onRunComplete(contexts, results) {
    if (!process.env.CI) {
      return;
    }

    const reportName = this._reportName;
    const rootDirectory = this._rootDirectory;
    const root = xmlBuilder.create(
      'testsuites',
      { encoding: 'utf-8' },
      {},
      { skipNullAttributes: true }
    );

    const msToIso = ms => ms ? new Date(ms).toISOString().slice(0, -5) : undefined;
    const msToSec = ms => ms ? (ms / 1000).toFixed(3) : undefined;

    root.att({
      name: 'jest',
      timestamp: msToIso(results.startTime),
      time: msToSec(Date.now() - results.startTime),
      tests: results.numTotalTests,
      failures: results.numFailedTests,
      skipped: results.numPendingTests,
    });

    // top level test results are the files/suites
    results.testResults.forEach(suite => {
      const suiteEl = root.ele('testsuite', {
        name: relative(rootDirectory, suite.testFilePath),
        timestamp: msToIso(suite.perfStats.start),
        time: msToSec(suite.perfStats.end - suite.perfStats.start),
        tests: suite.testResults.length,
        failures: suite.numFailedTests,
        skipped: suite.numPendingTests,
        file: suite.testFilePath
      });

      // nested in there are the tests in that file
      const relativePath = dirname(relative(rootDirectory, suite.testFilePath));
      const classname = `${reportName}.${relativePath.replace(/\./g, '·')}`;
      suite.testResults.forEach(test => {
        const testEl = suiteEl.ele('testcase', {
          classname,
          name: [...test.ancestorTitles, test.title].join(' '),
          time: msToSec(test.duration)
        });

        test.failureMessages.forEach((message) => {
          testEl.ele('failure').dat(message);
        });

        if (test.status === 'pending') {
          testEl.ele('skipped');
        }
      });
    });

    const reportPath = resolve(rootDirectory, `target/junit/${reportName}.xml`);
    const reportXML = root.end({
      pretty: true,
      indent: '  ',
      newline: '\n',
      spacebeforeslash: ''
    });

    mkdirp.sync(dirname(reportPath));
    writeFileSync(reportPath, reportXML, 'utf8');
  }
}
