import { resolve } from 'path';
import { readFileSync } from 'fs';

import { fromNode as fcb } from 'bluebird';
import { parseString } from 'xml2js';
import del from 'del';
import Mocha from 'mocha';
import expect from 'expect.js';

import { setupJunitReportGeneration } from '../junit_report_generation';

const PROJECT_DIR = resolve(__dirname, 'fixtures/project');
const DURATION_REGEX = /^\d+\.\d{3}$/;
const ISO_DATE_SEC_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;

describe('dev/mocha/junit report generation', () => {
  afterEach(() => {
    del.sync(resolve(PROJECT_DIR, 'target'));
  });

  it('reports on failed setup hooks', async () => {
    const mocha = new Mocha({
      reporter: function Runner(runner) {
        setupJunitReportGeneration(runner, {
          reportName: 'test',
          rootDirectory: PROJECT_DIR
        });
      }
    });

    mocha.addFile(resolve(PROJECT_DIR, 'test.js'));
    await new Promise(resolve => mocha.run(resolve));
    const report = await fcb(cb => parseString(readFileSync(resolve(PROJECT_DIR, 'target/junit/test.xml')), cb));

    // test case results are wrapped in <testsuites></testsuites>
    expect(report).to.eql({
      testsuites: {
        testsuite: [
          report.testsuites.testsuite[0]
        ]
      }
    });

    // the single <testsuite> element at the root contains summary data for all tests results
    const [ testsuite ] = report.testsuites.testsuite;
    expect(testsuite.$.time).to.match(DURATION_REGEX);
    expect(testsuite.$.timestamp).to.match(ISO_DATE_SEC_REGEX);
    expect(testsuite).to.eql({
      $: {
        failures: '2',
        skipped: '1',
        tests: '4',
        time: testsuite.$.time,
        timestamp: testsuite.$.timestamp,
      },
      testcase: testsuite.testcase,
    });

    // there are actually only three tests, but since the hook failed
    // it is reported as a test failure
    expect(testsuite.testcase).to.have.length(4);
    const [
      testPass,
      testFail,
      beforeEachFail,
      testSkipped,
    ] = testsuite.testcase;

    const sharedClassname = testPass.$.classname;
    expect(sharedClassname).to.match(/^test\.test[^\.]js$/);
    expect(testPass.$.time).to.match(DURATION_REGEX);
    expect(testPass).to.eql({
      $: {
        classname: sharedClassname,
        name: 'SUITE works',
        time: testPass.$.time,
      }
    });

    expect(testFail.$.time).to.match(DURATION_REGEX);
    expect(testFail.failure[0]).to.match(/Error: FORCE_TEST_FAIL\n.+fixtures.project.test.js/);
    expect(testFail).to.eql({
      $: {
        classname: sharedClassname,
        name: 'SUITE fails',
        time: testFail.$.time,
      },
      failure: [
        testFail.failure[0]
      ]
    });

    expect(beforeEachFail.$.time).to.match(DURATION_REGEX);
    expect(beforeEachFail.failure).to.have.length(1);
    expect(beforeEachFail.failure[0]).to.match(/Error: FORCE_HOOK_FAIL\n.+fixtures.project.test.js/);
    expect(beforeEachFail).to.eql({
      $: {
        classname: sharedClassname,
        name: 'SUITE SUB_SUITE "before each" hook: fail hook for "never runs"',
        time: beforeEachFail.$.time,
      },
      failure: [
        beforeEachFail.failure[0]
      ]
    });

    expect(testSkipped).to.eql({
      $: {
        classname: sharedClassname,
        name: 'SUITE SUB_SUITE never runs',
      },
      skipped: ['']
    });
  });
});
