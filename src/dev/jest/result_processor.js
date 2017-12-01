import { resolve, dirname, relative, basename, extname, sep as pathSep } from 'path';
import { writeFileSync } from 'fs';

import { camelCase } from 'lodash';
import mkdirp from 'mkdirp';
import xmlBuilder from 'xmlbuilder';

const ROOT = dirname(require.resolve('../../../package.json'));

/**
 * result processor that produces JUnit report when running on CI
 * @param  {JestResults} results see https://facebook.github.io/jest/docs/en/configuration.html#testresultsprocessor-string
 * @return {JestResults}
 */
export default function (results) {
  if (!process.env.CI) {
    return results;
  }

  const root = xmlBuilder.create(
    'testsuites',
    { encoding: 'utf-8' },
    {},
    { skipNullAttributes: true }
  );

  const msToIso = ms => ms ? new Date(ms).toISOString().slice(0, -5) : undefined;
  const msToSec = ms => ms ? (ms / 1000).toFixed(3) : undefined;
  const getClassName = suite => {
    const path = suite.testFilePath;
    const directory = dirname(path);
    const filenameWithoutExt = basename(path, extname(path));
    const segments = [...directory.split(pathSep), filenameWithoutExt];

    return segments
      .filter(seg => seg && seg !== 'src')
      .map(seg => seg[0].toUpperCase() + camelCase(seg.slice(1)))
      .join('/');
  };

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
      name: relative(ROOT, suite.testFilePath),
      timestamp: msToIso(suite.perfStats.start),
      time: msToSec(suite.perfStats.end - suite.perfStats.start),
      tests: suite.testResults.length,
      failures: suite.numFailedTests,
      skipped: suite.numPendingTests,
      file: suite.testFilePath
    });

    // nested in there are the tests in that file
    const classname = `Jest Tests.${getClassName(suite)}`;
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

  const reportPath = resolve(ROOT, `target/junit/jest.xml`);
  const reportXML = root.end({
    pretty: true,
    indent: '  ',
    newline: '\n',
    spacebeforeslash: ''
  });

  mkdirp.sync(dirname(reportPath));
  writeFileSync(reportPath, reportXML, 'utf8');

  return results;
}
