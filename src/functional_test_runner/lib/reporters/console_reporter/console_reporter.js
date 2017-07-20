import { format } from 'util';

import Mocha from 'mocha';

import * as colors from './colors';
import * as symbols from './symbols';
import { ms } from './ms';
import { writeEpilogue } from './write_epilogue';

export function ConsoleReporterProvider({ getService }) {
  const log = getService('log');

  return class MochaReporter extends Mocha.reporters.Base {
    constructor(runner) {
      super(runner);
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
    }

    onStart = () => {
      log.write('');
    }

    onHookStart = hook => {
      log.write('-> ' + colors.suite(hook.title));
      log.indent(2);
    }

    onHookEnd = () => {
      log.indent(-2);
    }

    onSuiteStart = suite => {
      if (!suite.root) {
        log.write('-: ' + colors.suite(suite.title));
      }

      log.indent(2);
    }

    onSuiteEnd = () => {
      if (log.indent(-2) === '') {
        log.write();
      }
    }

    onTestStart = test => {
      log.write(`-> ${test.title}`);
      log.indent(2);
    }

    onTestEnd = () => {
      log.indent(-2);
    }

    onPending = test => {
      log.write('-> ' + colors.pending(test.title));
      log.indent(2);
    }

    onPass = test => {

      let time = '';
      if (test.speed !== 'fast') {
        time = colors.speed(test.speed, ` (${ms(test.duration)})`);
      }

      const pass = colors.pass(`${symbols.ok} pass`);
      log.write(`- ${pass} ${time}`);
    }

    onFail = test => {
      // NOTE: this is super gross
      //
      //  - I started by trying to extract the Base.list() logic from mocha
      //    but it's a lot more complicated than this is horrible.
      //  - In order to fix the numbering and indentation we monkey-patch
      //    console.log and parse the logged output.
      //
      let output = '';
      const realLog = console.log;
      console.log = (...args) => output += `${format(...args)}\n`;
      try {
        Mocha.reporters.Base.list([test]);
      } finally {
        console.log = realLog;
      }

      log.indent(-2);
      log.write(
        `- ${symbols.err} ` +
        colors.fail(`fail: "${test.fullTitle()}"`) +
        '\n' +
        output
          .split('\n')
          .slice(2) // drop the first two lines, (empty + test title)
          .map(line => {
            // move leading colors behind leading spaces
            return line.replace(/^((?:\[.+m)+)(\s+)/, '$2$1');
          })
          .map(line => {
            // shrink mocha's indentation
            return line.replace(/^\s{5,5}/, ' ');
          })
          .join('\n')
      );
      log.indent(2);
    }

    onEnd = () => {
      writeEpilogue(log, this.stats);
    }
  };
}
