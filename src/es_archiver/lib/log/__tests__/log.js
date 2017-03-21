import expect from 'expect.js';
import Chance from 'chance';
import sinon from 'sinon';

import {
  createConcatStream,
  createPromiseFromStreams
} from '../../../../utils';

import { createLog } from '../';

const chance = new Chance();
const capture = (level, block) => {
  const log = createLog(level);
  block(log);
  log.end();
  return createPromiseFromStreams([ log, createConcatStream('') ]);
};

const nothingTest = (logLevel, method) => {
  describe(`#${method}(...any)`, () => {
    it('logs nothing', async () => {
      const output = await capture(logLevel, log => log[method]('foo'));
      expect(output).to.be('');
    });
  });
};

const somethingTest = (logLevel, method) => {
  describe(`#${method}(...any)`, () => {
    it('logs to output stream', async () => {
      const output = await capture(logLevel, log => log[method]('foo'));
      expect(output).to.contain('foo');
    });
  });
};

describe('esArchiver: createLog(logLevel, output)', () => {
  it('is a readable stream', async () => {
    const log = createLog('debug');
    log.info('Foo');
    log.info('Bar');
    log.info('Baz');
    log.end();

    const output = await createPromiseFromStreams([
      log,
      createConcatStream('')
    ]);

    expect(output).to.contain('Foo');
    expect(output).to.contain('Bar');
    expect(output).to.contain('Baz');
  });

  describe('log level', () => {
    context('logLevel=silent', () => {
      nothingTest('silent', 'debug');
      nothingTest('silent', 'info');
      nothingTest('silent', 'error');
    });
    context('logLevel=error', () => {
      nothingTest('error', 'debug');
      nothingTest('error', 'info');
      somethingTest('error', 'error');
    });
    context('logLevel=info', () => {
      nothingTest('info', 'debug');
      somethingTest('info', 'info');
      somethingTest('info', 'error');
    });
    context('logLevel=debug', () => {
      somethingTest('debug', 'debug');
      somethingTest('debug', 'info');
      somethingTest('debug', 'error');
    });
    context('invalid logLevel', () => {
      it('throw error', () => {
        // avoid the impossiblity that a valid level is generated
        // by specifying a long length
        const level = chance.word({ length: 10 });

        expect(() => createLog(level))
          .to.throwError(level);
      });
    });
  });
});
