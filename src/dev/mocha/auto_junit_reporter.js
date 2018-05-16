import mocha from 'mocha';
import { setupJunitReportGeneration } from './junit_report_generation';

const MochaSpecReporter = mocha.reporters.spec;

export function createAutoJunitReporter(junitReportOptions) {
  return class AutoJunitReporter {
    constructor(runner, options) {
      // setup a spec reporter for console output
      new MochaSpecReporter(runner, options);

      // in CI we also setup the Junit reporter
      if (process.env.CI) {
        setupJunitReportGeneration(runner, junitReportOptions);
      }
    }
  };
}
