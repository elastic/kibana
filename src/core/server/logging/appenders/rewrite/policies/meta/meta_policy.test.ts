/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogRecord, LogLevel, LogMeta } from '@kbn/logging';
import { MetaRewritePolicy, MetaRewritePolicyConfig } from './meta_policy';

describe('MetaRewritePolicy', () => {
  const createPolicy = (
    mode: MetaRewritePolicyConfig['mode'],
    properties: MetaRewritePolicyConfig['properties']
  ) => new MetaRewritePolicy({ type: 'meta', mode, properties });

  const createLogRecord = (meta: LogMeta = {}): LogRecord => ({
    timestamp: new Date(Date.UTC(2012, 1, 1, 14, 30, 22, 11)),
    level: LogLevel.Info,
    context: 'context',
    message: 'just a log',
    pid: 42,
    meta,
  });

  describe('mode: update', () => {
    it('updates existing properties in LogMeta', () => {
      // @ts-expect-error ECS custom meta
      const log = createLogRecord({ a: 'before' });
      const policy = createPolicy('update', [{ path: 'a', value: 'after' }]);
      // @ts-expect-error ECS custom meta
      expect(policy.rewrite(log).meta!.a).toBe('after');
    });

    it('updates nested properties in LogMeta', () => {
      const log = createLogRecord({
        error: { message: 'before b.c' },
        tags: ['0', '1'],
      });
      const policy = createPolicy('update', [
        { path: 'error.message', value: 'after b.c' },
        { path: 'tags[1]', value: '2' },
      ]);
      expect(policy.rewrite(log).meta).toMatchInlineSnapshot(`
        Object {
          "error": Object {
            "message": "after b.c",
          },
          "tags": Array [
            "0",
            "2",
          ],
        }
      `);
    });

    it('handles string, number, boolean, null', () => {
      const policy = createPolicy('update', [
        { path: 'a', value: false },
        { path: 'b', value: null },
        { path: 'c', value: 123 },
        { path: 'd', value: 'hi' },
      ]);
      const log = createLogRecord({
        // @ts-expect-error ECS custom meta
        a: 'a',
        b: 'b',
        c: 'c',
        d: 'd',
      });
      expect(policy.rewrite(log).meta).toMatchInlineSnapshot(`
        Object {
          "a": false,
          "b": null,
          "c": 123,
          "d": "hi",
        }
      `);
    });

    it(`does not add properties which don't exist yet`, () => {
      const policy = createPolicy('update', [
        { path: 'error.message', value: 'foo' },
        { path: 'error.id', value: 'bar' },
      ]);
      const log = createLogRecord({ error: { message: 'existing meta' } });
      const { meta } = policy.rewrite(log);
      expect(meta?.error?.message).toBe('foo');
      expect(meta?.error?.id).toBeUndefined();
    });

    it('does not touch anything outside of LogMeta', () => {
      const policy = createPolicy('update', [{ path: 'a', value: 'bar' }]);
      const message = Symbol();
      expect(policy.rewrite({ message, meta: { a: 'foo' } } as unknown as LogRecord).message).toBe(
        message
      );
      expect(policy.rewrite({ message, meta: { a: 'foo' } } as unknown as LogRecord))
        .toMatchInlineSnapshot(`
        Object {
          "message": Symbol(),
          "meta": Object {
            "a": "bar",
          },
        }
      `);
    });
  });

  describe('mode: remove', () => {
    it('removes existing properties in LogMeta', () => {
      const log = createLogRecord({ error: { message: 'before' } });
      const policy = createPolicy('remove', [{ path: 'error' }]);
      expect(policy.rewrite(log).meta?.error).toBeUndefined();
    });

    it('removes nested properties in LogMeta', () => {
      const log = createLogRecord({ error: { message: 'reason' }, tags: ['0', '1'] });
      const policy = createPolicy('remove', [{ path: 'error.message' }, { path: 'tags[1]' }]);
      expect(policy.rewrite(log).meta).toMatchInlineSnapshot(`
        Object {
          "error": Object {},
          "tags": Array [
            "0",
            undefined,
          ],
        }
      `);
    });

    it('has no effect if property does not exist', () => {
      const log = createLogRecord({ error: {} });
      const policy = createPolicy('remove', [{ path: 'b' }]);
      expect(policy.rewrite(log).meta).toMatchInlineSnapshot(`
        Object {
          "error": Object {},
        }
      `);
    });

    it('does not touch anything outside of LogMeta', () => {
      const policy = createPolicy('remove', [{ path: 'message' }]);
      const message = Symbol();
      expect(
        policy.rewrite({ message, meta: { message: 'foo' } } as unknown as LogRecord).message
      ).toBe(message);
      expect(policy.rewrite({ message, meta: { message: 'foo' } } as unknown as LogRecord))
        .toMatchInlineSnapshot(`
        Object {
          "message": Symbol(),
          "meta": Object {},
        }
      `);
    });
  });
});
