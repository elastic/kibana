import expect from 'expect.js';
import sinon from 'sinon';

import {
  createConcatStream,
  createPromiseFromStreams
} from '../../../utils';

import { createLog } from '../';

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
    const log = createLog(3);
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
    context('logLevel=0', () => {
      nothingTest(0, 'debug');
      nothingTest(0, 'info');
      nothingTest(0, 'error');
    });
    context('logLevel=1', () => {
      nothingTest(1, 'debug');
      nothingTest(1, 'info');
      somethingTest(1, 'error');
    });
    context('logLevel=2', () => {
      nothingTest(2, 'debug');
      somethingTest(2, 'info');
      somethingTest(2, 'error');
    });
    context('logLevel=3', () => {
      somethingTest(3, 'debug');
      somethingTest(3, 'info');
      somethingTest(3, 'error');
    });
  });
});
