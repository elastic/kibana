/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createStreamingBatchedFunction } from './create_streaming_batched_function';
import { fetchStreaming as fetchStreamingReal } from '../streaming/fetch_streaming';
import { AbortError, defer, of } from '../../../kibana_utils/public';
import { Subject, of as rxof } from 'rxjs';

const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

const getPromiseState = (promise: Promise<unknown>): Promise<'resolved' | 'rejected' | 'pending'> =>
  Promise.race<'resolved' | 'rejected' | 'pending'>([
    new Promise<any>((resolve) =>
      promise.then(
        () => resolve('resolved'),
        () => resolve('rejected')
      )
    ),
    new Promise<'pending'>((resolve) => resolve('pending')).then(() => 'pending'),
  ]);

const isPending = (promise: Promise<unknown>): Promise<boolean> =>
  getPromiseState(promise).then((state) => state === 'pending');

const setup = () => {
  const xhr = ({} as unknown) as XMLHttpRequest;
  const { promise, resolve, reject } = defer<void>();
  const stream = new Subject<any>();

  const fetchStreaming = (jest.fn(() => ({
    xhr,
    promise,
    stream,
  })) as unknown) as jest.SpyInstance & typeof fetchStreamingReal;

  return {
    fetchStreaming,
    xhr,
    promise,
    resolve,
    reject,
    stream,
  };
};

// FLAKY: https://github.com/elastic/kibana/issues/101126
describe.skip('createStreamingBatchedFunction()', () => {
  test('returns a function', () => {
    const { fetchStreaming } = setup();
    const fn = createStreamingBatchedFunction({
      url: '/test',
      fetchStreaming,
      compressionDisabled$: rxof(true),
    });
    expect(typeof fn).toBe('function');
  });

  test('returned function is async', () => {
    const { fetchStreaming } = setup();
    const fn = createStreamingBatchedFunction({
      url: '/test',
      fetchStreaming,
      compressionDisabled$: rxof(true),
    });
    const res = fn({});
    expect(typeof res.then).toBe('function');
  });

  describe('when timeout is reached', () => {
    test('dispatches batch', async () => {
      const { fetchStreaming } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      expect(fetchStreaming).toHaveBeenCalledTimes(0);
      fn({ foo: 'bar' });
      expect(fetchStreaming).toHaveBeenCalledTimes(0);
      fn({ baz: 'quix' });
      expect(fetchStreaming).toHaveBeenCalledTimes(0);

      await new Promise((r) => setTimeout(r, 6));
      expect(fetchStreaming).toHaveBeenCalledTimes(1);
    });

    test('does nothing is buffer is empty', async () => {
      const { fetchStreaming } = setup();
      createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      expect(fetchStreaming).toHaveBeenCalledTimes(0);
      await new Promise((r) => setTimeout(r, 6));
      expect(fetchStreaming).toHaveBeenCalledTimes(0);
    });

    test('sends POST request to correct endpoint', async () => {
      const { fetchStreaming } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      fn({ foo: 'bar' });
      await new Promise((r) => setTimeout(r, 6));

      expect(fetchStreaming.mock.calls[0][0]).toMatchObject({
        url: '/test',
        method: 'POST',
      });
    });

    test('collects calls into an array batch ordered by in same order as calls', async () => {
      const { fetchStreaming } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      fn({ foo: 'bar' });
      fn({ baz: 'quix' });

      await new Promise((r) => setTimeout(r, 6));
      const { body } = fetchStreaming.mock.calls[0][0];
      expect(JSON.parse(body)).toEqual({
        batch: [{ foo: 'bar' }, { baz: 'quix' }],
      });
    });
  });

  describe('when buffer becomes full', () => {
    test('dispatches batch request', async () => {
      const { fetchStreaming } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      expect(fetchStreaming).toHaveBeenCalledTimes(0);
      fn({ foo: 'bar' });
      await flushPromises();
      expect(fetchStreaming).toHaveBeenCalledTimes(0);
      fn({ baz: 'quix' });
      await flushPromises();
      expect(fetchStreaming).toHaveBeenCalledTimes(0);
      fn({ full: 'yep' });
      await flushPromises();
      expect(fetchStreaming).toHaveBeenCalledTimes(1);
    });

    test('ignores a request with an aborted signal', async () => {
      const { fetchStreaming } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      const abortController = new AbortController();
      abortController.abort();

      of(fn({ foo: 'bar' }, abortController.signal));
      fn({ baz: 'quix' });

      await new Promise((r) => setTimeout(r, 6));
      const { body } = fetchStreaming.mock.calls[0][0];
      expect(JSON.parse(body)).toEqual({
        batch: [{ baz: 'quix' }],
      });
    });

    test('sends POST request to correct endpoint with items in array batched sorted in call order', async () => {
      const { fetchStreaming } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      fn({ a: '1' });
      fn({ b: '2' });
      fn({ c: '3' });
      await flushPromises();

      expect(fetchStreaming.mock.calls[0][0]).toMatchObject({
        url: '/test',
        method: 'POST',
      });
      const { body } = fetchStreaming.mock.calls[0][0];
      expect(JSON.parse(body)).toEqual({
        batch: [{ a: '1' }, { b: '2' }, { c: '3' }],
      });
    });

    test('dispatches batch on full buffer and also on timeout', async () => {
      const { fetchStreaming } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      fn({ a: '1' });
      fn({ b: '2' });
      fn({ c: '3' });
      await flushPromises();
      expect(fetchStreaming).toHaveBeenCalledTimes(1);
      fn({ d: '4' });
      await flushPromises();
      await new Promise((r) => setTimeout(r, 6));
      expect(fetchStreaming).toHaveBeenCalledTimes(2);
    });
  });

  describe('when receiving results', () => {
    test('does not resolve call promises until request finishes', async () => {
      const { fetchStreaming } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      const promise1 = fn({ a: '1' });
      const promise2 = fn({ b: '2' });
      await new Promise((r) => setTimeout(r, 6));

      expect(await isPending(promise1)).toBe(true);
      expect(await isPending(promise2)).toBe(true);
    });

    test('resolves only promise of result that was streamed back', async () => {
      const { fetchStreaming, stream } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      await flushPromises();

      const promise1 = fn({ a: '1' });
      const promise2 = fn({ b: '2' });
      const promise3 = fn({ c: '3' });
      await new Promise((r) => setTimeout(r, 6));

      expect(await isPending(promise1)).toBe(true);
      expect(await isPending(promise2)).toBe(true);
      expect(await isPending(promise3)).toBe(true);

      stream.next(
        JSON.stringify({
          id: 1,
          result: { foo: 'bar' },
        }) + '\n'
      );

      expect(await isPending(promise1)).toBe(true);
      expect(await isPending(promise2)).toBe(false);
      expect(await isPending(promise3)).toBe(true);

      stream.next(
        JSON.stringify({
          id: 0,
          result: { foo: 'bar 2' },
        }) + '\n'
      );

      expect(await isPending(promise1)).toBe(false);
      expect(await isPending(promise2)).toBe(false);
      expect(await isPending(promise3)).toBe(true);
    });

    test('resolves each promise with correct data', async () => {
      const { fetchStreaming, stream } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      const promise1 = fn({ a: '1' });
      const promise2 = fn({ b: '2' });
      const promise3 = fn({ c: '3' });
      await new Promise((r) => setTimeout(r, 6));

      stream.next(
        JSON.stringify({
          id: 1,
          result: { foo: 'bar' },
        }) + '\n'
      );
      stream.next(
        JSON.stringify({
          id: 2,
          result: { foo: 'bar 2' },
        }) + '\n'
      );

      expect(await isPending(promise1)).toBe(true);
      expect(await isPending(promise2)).toBe(false);
      expect(await isPending(promise3)).toBe(false);
      expect(await promise2).toEqual({ foo: 'bar' });
      expect(await promise3).toEqual({ foo: 'bar 2' });
    });

    test('compression is false by default', async () => {
      const { fetchStreaming } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        flushOnMaxItems: 1,
        fetchStreaming,
      });

      fn({ a: '1' });

      const dontCompress = await fetchStreaming.mock.calls[0][0].compressionDisabled$.toPromise();
      expect(dontCompress).toBe(false);
    });

    test('resolves falsy results', async () => {
      const { fetchStreaming, stream } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      const promise1 = fn({ a: '1' });
      const promise2 = fn({ b: '2' });
      const promise3 = fn({ c: '3' });
      await new Promise((r) => setTimeout(r, 6));

      stream.next(
        JSON.stringify({
          id: 0,
          result: false,
        }) + '\n'
      );
      stream.next(
        JSON.stringify({
          id: 1,
          result: 0,
        }) + '\n'
      );
      stream.next(
        JSON.stringify({
          id: 2,
          result: '',
        }) + '\n'
      );

      expect(await isPending(promise1)).toBe(false);
      expect(await isPending(promise2)).toBe(false);
      expect(await isPending(promise3)).toBe(false);
      expect(await promise1).toEqual(false);
      expect(await promise2).toEqual(0);
      expect(await promise3).toEqual('');
    });

    test('rejects promise on error response', async () => {
      const { fetchStreaming, stream } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      const promise = fn({ a: '1' });
      await new Promise((r) => setTimeout(r, 6));

      expect(await isPending(promise)).toBe(true);

      stream.next(
        JSON.stringify({
          id: 0,
          error: { message: 'oops' },
        }) + '\n'
      );

      expect(await isPending(promise)).toBe(false);
      const [, error] = await of(promise);
      expect(error).toEqual({
        message: 'oops',
      });
    });

    test('resolves successful requests even after rejected ones', async () => {
      const { fetchStreaming, stream } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });

      const promise1 = of(fn({ a: '1' }));
      const promise2 = of(fn({ a: '2' }));
      const promise3 = of(fn({ a: '3' }));

      await new Promise((r) => setTimeout(r, 6));

      stream.next(
        JSON.stringify({
          id: 2,
          result: { b: '3' },
        }) + '\n'
      );

      await new Promise((r) => setTimeout(r, 1));

      stream.next(
        JSON.stringify({
          id: 1,
          error: { b: '2' },
        }) + '\n'
      );

      await new Promise((r) => setTimeout(r, 1));

      stream.next(
        JSON.stringify({
          id: 0,
          result: { b: '1' },
        }) + '\n'
      );

      await new Promise((r) => setTimeout(r, 1));

      const [result1] = await promise1;
      const [, error2] = await promise2;
      const [result3] = await promise3;

      expect(result1).toEqual({ b: '1' });
      expect(error2).toEqual({ b: '2' });
      expect(result3).toEqual({ b: '3' });
    });

    describe('when requests are aborted', () => {
      test('aborts stream when all are aborted', async () => {
        const { fetchStreaming } = setup();
        const fn = createStreamingBatchedFunction({
          url: '/test',
          fetchStreaming,
          maxItemAge: 5,
          flushOnMaxItems: 3,
          compressionDisabled$: rxof(true),
        });

        const abortController = new AbortController();
        const promise = fn({ a: '1' }, abortController.signal);
        const promise2 = fn({ a: '2' }, abortController.signal);
        await new Promise((r) => setTimeout(r, 6));

        expect(await isPending(promise)).toBe(true);
        expect(await isPending(promise2)).toBe(true);

        abortController.abort();
        await new Promise((r) => setTimeout(r, 6));

        expect(await isPending(promise)).toBe(false);
        expect(await isPending(promise2)).toBe(false);
        const [, error] = await of(promise);
        const [, error2] = await of(promise2);
        expect(error).toBeInstanceOf(AbortError);
        expect(error2).toBeInstanceOf(AbortError);
        expect(fetchStreaming.mock.calls[0][0].signal.aborted).toBeTruthy();
      });

      test('rejects promise on abort and lets others continue', async () => {
        const { fetchStreaming, stream } = setup();
        const fn = createStreamingBatchedFunction({
          url: '/test',
          fetchStreaming,
          maxItemAge: 5,
          flushOnMaxItems: 3,
          compressionDisabled$: rxof(true),
        });

        const abortController = new AbortController();
        const promise = fn({ a: '1' }, abortController.signal);
        const promise2 = fn({ a: '2' });
        await new Promise((r) => setTimeout(r, 6));

        expect(await isPending(promise)).toBe(true);

        abortController.abort();
        await new Promise((r) => setTimeout(r, 6));

        expect(await isPending(promise)).toBe(false);
        const [, error] = await of(promise);
        expect(error).toBeInstanceOf(AbortError);

        stream.next(
          JSON.stringify({
            id: 1,
            result: { b: '2' },
          }) + '\n'
        );

        await new Promise((r) => setTimeout(r, 1));

        const [result2] = await of(promise2);
        expect(result2).toEqual({ b: '2' });
      });
    });

    describe('when stream closes prematurely', () => {
      test('rejects pending promises with CONNECTION error code', async () => {
        const { fetchStreaming, stream } = setup();
        const fn = createStreamingBatchedFunction({
          url: '/test',
          fetchStreaming,
          maxItemAge: 5,
          flushOnMaxItems: 3,
          compressionDisabled$: rxof(true),
        });

        const promise1 = of(fn({ a: '1' }));
        const promise2 = of(fn({ a: '2' }));

        await new Promise((r) => setTimeout(r, 6));

        stream.complete();

        await new Promise((r) => setTimeout(r, 1));

        const [, error1] = await promise1;
        const [, error2] = await promise2;
        expect(error1).toMatchObject({
          message: 'Connection terminated prematurely.',
          code: 'CONNECTION',
        });
        expect(error2).toMatchObject({
          message: 'Connection terminated prematurely.',
          code: 'CONNECTION',
        });
      });

      test('rejects with CONNECTION error only pending promises', async () => {
        const { fetchStreaming, stream } = setup();
        const fn = createStreamingBatchedFunction({
          url: '/test',
          fetchStreaming,
          maxItemAge: 5,
          flushOnMaxItems: 3,
          compressionDisabled$: rxof(true),
        });

        const promise1 = of(fn({ a: '1' }));
        const promise2 = of(fn({ a: '2' }));

        await new Promise((r) => setTimeout(r, 6));

        stream.next(
          JSON.stringify({
            id: 1,
            result: { b: '1' },
          }) + '\n'
        );
        stream.complete();

        await new Promise((r) => setTimeout(r, 1));

        const [, error1] = await promise1;
        const [result1] = await promise2;
        expect(error1).toMatchObject({
          message: 'Connection terminated prematurely.',
          code: 'CONNECTION',
        });
        expect(result1).toMatchObject({
          b: '1',
        });
      });
    });

    describe('when stream errors', () => {
      test('rejects pending promises with STREAM error code', async () => {
        const { fetchStreaming, stream } = setup();
        const fn = createStreamingBatchedFunction({
          url: '/test',
          fetchStreaming,
          maxItemAge: 5,
          flushOnMaxItems: 3,
          compressionDisabled$: rxof(true),
        });

        const promise1 = of(fn({ a: '1' }));
        const promise2 = of(fn({ a: '2' }));

        await new Promise((r) => setTimeout(r, 6));

        stream.error({
          message: 'something went wrong',
        });

        await new Promise((r) => setTimeout(r, 1));

        const [, error1] = await promise1;
        const [, error2] = await promise2;
        expect(error1).toMatchObject({
          message: 'something went wrong',
          code: 'STREAM',
        });
        expect(error2).toMatchObject({
          message: 'something went wrong',
          code: 'STREAM',
        });
      });

      test('rejects with STREAM error only pending promises', async () => {
        const { fetchStreaming, stream } = setup();
        const fn = createStreamingBatchedFunction({
          url: '/test',
          fetchStreaming,
          maxItemAge: 5,
          flushOnMaxItems: 3,
          compressionDisabled$: rxof(true),
        });

        const promise1 = of(fn({ a: '1' }));
        const promise2 = of(fn({ a: '2' }));

        await new Promise((r) => setTimeout(r, 6));

        stream.next(
          JSON.stringify({
            id: 1,
            result: { b: '1' },
          }) + '\n'
        );
        stream.error('oops');

        await new Promise((r) => setTimeout(r, 1));

        const [, error1] = await promise1;
        const [result1] = await promise2;
        expect(error1).toMatchObject({
          message: 'oops',
          code: 'STREAM',
        });
        expect(result1).toMatchObject({
          b: '1',
        });
      });
    });

    test('rejects with STREAM error on JSON parse error only pending promises', async () => {
      const { fetchStreaming, stream } = setup();
      const fn = createStreamingBatchedFunction({
        url: '/test',
        fetchStreaming,
        maxItemAge: 5,
        flushOnMaxItems: 3,
        compressionDisabled$: rxof(true),
      });
      await flushPromises();

      const promise1 = of(fn({ a: '1' }));
      const promise2 = of(fn({ a: '2' }));

      await new Promise((r) => setTimeout(r, 6));

      stream.next(
        JSON.stringify({
          id: 1,
          result: { b: '1' },
        }) + '\n'
      );

      stream.next('Not a JSON\n');

      await new Promise((r) => setTimeout(r, 1));

      const [, error1] = await promise1;
      const [result1] = await promise2;
      expect(error1).toMatchObject({
        message: 'Unexpected token N in JSON at position 0',
        code: 'STREAM',
      });
      expect(result1).toMatchObject({
        b: '1',
      });
    });
  });
});
