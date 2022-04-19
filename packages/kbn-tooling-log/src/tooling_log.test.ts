/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { toArray, takeUntil } from 'rxjs/operators';

import { createStripAnsiSerializer } from '@kbn/jest-serializers';

import { ToolingLog } from './tooling_log';
import { Writer } from './writer';
import { ToolingLogTextWriter } from './tooling_log_text_writer';
import { ToolingLogCollectingWriter } from './tooling_log_collecting_writer';
import { lastValueFrom } from 'rxjs';

expect.addSnapshotSerializer(createStripAnsiSerializer());

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

  it('resets the indentation after block executes and promise resolves', async () => {
    const log = new ToolingLog();
    const writer = new ToolingLogCollectingWriter();
    log.setWriters([writer]);

    log.info('base');
    await log.indent(2, async () => {
      log.indent(2);
      log.info('hello');
      log.indent(2);
      log.info('world');
    });
    log.info('back to base');

    expect(writer.messages).toMatchInlineSnapshot(`
      Array [
        " info base",
        "   │ info hello",
        "     │ info world",
        " info back to base",
      ]
    `);
  });

  it('resets the indent synchrounsly if the block does not return a promise', () => {
    const log = new ToolingLog();
    const writer = new ToolingLogCollectingWriter();
    log.setWriters([writer]);

    log.info('foo');
    log.indent(4, () => log.error('bar'));
    log.info('baz');

    expect(writer.messages).toMatchInlineSnapshot(`
      Array [
        " info foo",
        "   │ERROR bar",
        " info baz",
      ]
    `);
  });
});

(['verbose', 'debug', 'info', 'success', 'warning', 'error', 'write'] as const).forEach(
  (method) => {
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
  }
);

describe('#getWritten$()', () => {
  async function testWrittenMsgs(writers: Writer[]) {
    const log = new ToolingLog();
    log.setWriters(writers);

    const done$ = new Rx.Subject<void>();
    const promise = lastValueFrom(log.getWritten$().pipe(takeUntil(done$), toArray()));

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

describe('#withType()', () => {
  it('creates a child logger with a unique type that respects all other settings', () => {
    const writerA = new ToolingLogCollectingWriter();
    const writerB = new ToolingLogCollectingWriter();
    const log = new ToolingLog();
    log.setWriters([writerA]);

    const fork = log.withType('someType');
    log.info('hello');
    fork.info('world');
    fork.indent(2);
    log.debug('indented');
    fork.indent(-2);
    log.debug('not-indented');

    log.setWriters([writerB]);
    fork.info('to new writer');
    fork.indent(5);
    log.info('also to new writer');

    expect(writerA.messages).toMatchInlineSnapshot(`
      Array [
        " info hello",
        " info source[someType] world",
        " │ debg indented",
        " debg not-indented",
      ]
    `);
    expect(writerB.messages).toMatchInlineSnapshot(`
      Array [
        " info source[someType] to new writer",
        "    │ info also to new writer",
      ]
    `);
  });
});
