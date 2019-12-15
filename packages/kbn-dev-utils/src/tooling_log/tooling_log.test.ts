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

import * as Rx from 'rxjs';
import { toArray, takeUntil } from 'rxjs/operators';

import { ToolingLog } from './tooling_log';
import { Writer } from './writer';
import { ToolingLogTextWriter } from './tooling_log_text_writer';

it('creates zero writers without a config', () => {
  const log = new ToolingLog();
  expect(log.getWriters()).toHaveLength(0);
});

it('creates a single writer with a single object', () => {
  const log = new ToolingLog({ level: 'warning', writeTo: process.stdout });
  expect(log.getWriters()).toHaveLength(1);
  const [writer] = log.getWriters() as [ToolingLogTextWriter];
  expect(writer.level).toHaveProperty('name', 'warning');
  expect(writer.writeTo).toBe(process.stdout);
});

describe('#get/setWriters()', () => {
  it('returns/replaces the current writers', () => {
    const log = new ToolingLog();
    expect(log.getWriters()).toHaveLength(0);

    log.setWriters([
      new ToolingLogTextWriter({
        level: 'verbose',
        writeTo: process.stdout,
      }),
      new ToolingLogTextWriter({
        level: 'verbose',
        writeTo: process.stdout,
      }),
    ]);
    expect(log.getWriters()).toHaveLength(2);

    log.setWriters([]);
    expect(log.getWriters()).toHaveLength(0);
  });
});

describe('#indent()', () => {
  it('changes the indent on each written msg', () => {
    const log = new ToolingLog();
    const write = jest.fn();
    log.setWriters([{ write }]);

    log.indent(1);
    log.debug('foo');
    log.indent(2);
    log.debug('bar');
    log.indent(3);
    log.debug('baz');
    log.indent(-2);
    log.debug('box');
    log.indent(-Infinity);
    log.debug('foo');

    expect(write.mock.calls).toMatchSnapshot();
  });
});

(['verbose', 'debug', 'info', 'success', 'warning', 'error', 'write'] as const).forEach(method => {
  describe(`#${method}()`, () => {
    it(`sends a msg of type "${method}" to each writer with indent and arguments`, () => {
      const log = new ToolingLog();
      const writeA = jest.fn();
      const writeB = jest.fn();

      log.setWriters([{ write: writeA }, { write: writeB }]);

      if (method === 'error') {
        const error = new Error('error message');
        error.stack = '... stack trace ...';
        log.error(error);
        log.error('string message');
      } else {
        log[method]('foo', 'bar', 'baz');
      }

      expect(writeA.mock.calls).toMatchSnapshot();
      expect(writeA.mock.calls).toEqual(writeB.mock.calls);
    });
  });
});

describe('#getWritten$()', () => {
  async function testWrittenMsgs(writers: Writer[]) {
    const log = new ToolingLog();
    log.setWriters(writers);

    const done$ = new Rx.Subject();
    const promise = log
      .getWritten$()
      .pipe(takeUntil(done$), toArray())
      .toPromise();

    log.debug('foo');
    log.info('bar');
    log.verbose('baz');
    done$.next();

    expect(await promise).toMatchSnapshot();
  }

  it('does not emit msg when no writers', async () => {
    await testWrittenMsgs([]);
  });

  it('emits msg if all writers return true', async () => {
    await testWrittenMsgs([{ write: jest.fn(() => true) }, { write: jest.fn(() => true) }]);
  });

  it('emits msg if some writers return true', async () => {
    await testWrittenMsgs([{ write: jest.fn(() => true) }, { write: jest.fn(() => false) }]);
  });

  it('does not emit msg if all writers return false', async () => {
    await testWrittenMsgs([{ write: jest.fn(() => false) }, { write: jest.fn(() => false) }]);
  });
});
