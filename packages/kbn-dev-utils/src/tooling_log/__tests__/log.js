/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from 'expect.js';
import Chance from 'chance';

import { createConcatStream, createPromiseFromStreams } from '../../streams';

import { createToolingLog } from '../tooling_log';

const chance = new Chance();
const capture = (level, block) => {
  const log = createToolingLog(level);
  block(log);
  log.end();
  return createPromiseFromStreams([log, createConcatStream('')]);
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

describe('utils: createToolingLog(logLevel, output)', () => {
  it('is a readable stream', async () => {
    const log = createToolingLog('debug');
    log.info('Foo');
    log.info('Bar');
    log.info('Baz');
    log.end();

    const output = await createPromiseFromStreams([
      log,
      createConcatStream(''),
    ]);

    expect(output).to.contain('Foo');
    expect(output).to.contain('Bar');
    expect(output).to.contain('Baz');
  });

  describe('log level', () => {
    describe('logLevel=silent', () => {
      nothingTest('silent', 'debug');
      nothingTest('silent', 'info');
      nothingTest('silent', 'error');
    });
    describe('logLevel=error', () => {
      nothingTest('error', 'debug');
      nothingTest('error', 'info');
      somethingTest('error', 'error');
    });
    describe('logLevel=info', () => {
      nothingTest('info', 'debug');
      somethingTest('info', 'info');
      somethingTest('info', 'error');
    });
    describe('logLevel=debug', () => {
      somethingTest('debug', 'debug');
      somethingTest('debug', 'info');
      somethingTest('debug', 'error');
    });
    describe('invalid logLevel', () => {
      it('throw error', () => {
        // avoid the impossiblity that a valid level is generated
        // by specifying a long length
        const level = chance.word({ length: 10 });

        expect(() => createToolingLog(level)).to.throwError(level);
      });
    });
  });
});
