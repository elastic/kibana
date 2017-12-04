import { resolve, dirname, relative, sep as pathSep, extname, basename } from 'path';
import { writeFileSync } from 'fs';
import { inspect } from 'util';

import { camelCase } from 'lodash';
import mkdirp from 'mkdirp';
import xmlBuilder from 'xmlbuilder';

const PATH_SEGMENTS_TO_IGNORE = [
  '.',
  '..',
  'src',
  '__tests__',
];

export function setupJunitReportGeneration(runner, options = {}) {
  const {
    reportName = 'Unnamed Mocha Tests',
    rootDirectory = dirname(require.resolve('../../../package.json')),
  } = options;

  const rootSuite = runner.suite;
  const isTestFailed = test => test.state === 'failed';
  const isTestPending = test => !!test.pending;
  const returnTrue = () => true;

  const getDuration = (node) => (
    node.startTime && node.endTime
      ? ((node.endTime - node.startTime) / 1000).toFixed(3)
      : null
  );

  const getTimestamp = (node) => (
    node.startTime
      ? new Date(node.startTime).toISOString().slice(0, -5)
      : null
  );

  const countTests = (suite, filter = returnTrue) => (
    suite.suites.reduce((sum, suite) => (
      sum + countTests(suite, filter)
    ), suite.tests.filter(filter).length)
  );

  const getFullTitle = node => {
    const parentTitle = node.parent && getFullTitle(node.parent);
    return parentTitle ? `${parentTitle} ${node.title}` : node.title;
  };

  const getPath = node => {
    if (node.file) {
      return relative(rootDirectory, node.file);
    }

    if (node.parent) {
      return getPath(node.parent);
    }

    return 'unknown';
  };

  const getClassName = node => {
    const path = getPath(node);
    const directory = dirname(path);
    const filenameWithoutExt = basename(path, extname(path));
    const segments = [...directory.split(pathSep), filenameWithoutExt];

    return segments
      .filter(seg => seg && !PATH_SEGMENTS_TO_IGNORE.includes(seg))
      .map(seg => seg[0].toUpperCase() + camelCase(seg.slice(1)))
      .join('/');
  };

  runner.on('start', () => {
    rootSuite.startTime = Date.now();
  });

  runner.on('suite', (suite) => {
    suite.startTime = Date.now();
  });

  runner.on('test', (test) => {
    test.startTime = Date.now();
  });

  runner.on('test end', (test) => {
    test.endTime = Date.now();
  });

  runner.on('suite end', (suite) => {
    suite.endTime = Date.now();
  });

  runner.on('end', () => {
    rootSuite.endTime = Date.now();
    const builder = xmlBuilder.create(
      'testsuites',
      { encoding: 'utf-8' },
      {},
      { skipNullAttributes: true }
    );

    function addSuite(parent, suite) {
      const attributes = {
        name: suite.title,
        timestamp: getTimestamp(suite),
        time: getDuration(suite),
        tests: countTests(suite),
        failures: countTests(suite, isTestFailed),
        skipped: countTests(suite, isTestPending),
        file: suite.file
      };

      const el = suite === rootSuite
        ? parent.att(attributes)
        : parent.ele('testsuite', attributes);

      suite.suites.forEach(childSuite => {
        addSuite(el, childSuite);
      });

      suite.tests.forEach(test => {
        addTest(el, test);
      });
    }

    function addTest(parent, test) {
      const el = parent.ele('testcase', {
        name: getFullTitle(test),
        classname: `${reportName}.${getClassName(test)}`,
        time: getDuration(test),
      });

      if (isTestFailed(test)) {
        el
          .ele('failure')
          .dat(inspect(test.err));
      } else if (isTestPending(test)) {
        el.ele('skipped');
      }
    }

    addSuite(builder, rootSuite);

    const reportPath = resolve(rootDirectory, `target/junit/${reportName}.xml`);
    const reportXML = builder.end({
      pretty: true,
      indent: '  ',
      newline: '\n',
      spacebeforeslash: ''
    });

    mkdirp.sync(dirname(reportPath));
    writeFileSync(reportPath, reportXML, 'utf8');
  });
}
