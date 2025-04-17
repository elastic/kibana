/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Logger } from '@kbn/logging';
import { observableIntoEventSourceStream } from './observable_into_event_source_stream';
import { PassThrough } from 'node:stream';
import { Subject } from 'rxjs';
import { ServerSentEvent, ServerSentEventType } from '@kbn/sse-utils/src/events';
import {
  ServerSentEventErrorCode,
  createSSEInternalError,
  createSSERequestError,
} from '@kbn/sse-utils/src/errors';

describe('observableIntoEventSourceStream', () => {
  let logger: jest.Mocked<Logger>;

  let controller: AbortController;

  let stream: PassThrough & { flush: () => void };
  let source$: Subject<ServerSentEvent>;

  let data: string[];
  let streamFlushSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    logger = {
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    controller = new AbortController();
    source$ = new Subject();
    data = [];

    stream = observableIntoEventSourceStream(source$, { logger, signal: controller.signal });
    stream.on('data', (chunk) => {
      data.push(chunk.toString());
    });
    streamFlushSpy = jest.spyOn(stream, 'flush');
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('writes events into the stream in SSE format', () => {
    source$.next({ type: ServerSentEventType.data, data: { foo: 'bar' } });
    source$.complete();

    jest.runAllTimers();

    expect(data).toEqual(['event: data\ndata: {"data":{"foo":"bar"}}\n\n']);
    expect(streamFlushSpy).toHaveBeenCalledTimes(1);
  });

  it('multiple writes only call flush twice', () => {
    source$.next({ type: ServerSentEventType.data, data: { foo: 'bar-1' } });
    source$.next({ type: ServerSentEventType.data, data: { foo: 'bar-2' } });
    source$.next({ type: ServerSentEventType.data, data: { foo: 'bar-3' } });
    source$.next({ type: ServerSentEventType.data, data: { foo: 'bar-4' } });
    source$.complete();

    expect(streamFlushSpy).toHaveBeenCalledTimes(1); // on the first message

    jest.advanceTimersByTime(50); // Advance half the throttling time

    expect(streamFlushSpy).toHaveBeenCalledTimes(1); // still the first flush only

    jest.advanceTimersByTime(50); // Advance throttling time

    expect(streamFlushSpy).toHaveBeenCalledTimes(2); // on the first message, and after the throttling time

    jest.runAllTimers();

    expect(data).toEqual([
      'event: data\ndata: {"data":{"foo":"bar-1"}}\n\n',
      'event: data\ndata: {"data":{"foo":"bar-2"}}\n\n',
      'event: data\ndata: {"data":{"foo":"bar-3"}}\n\n',
      'event: data\ndata: {"data":{"foo":"bar-4"}}\n\n',
    ]);
    expect(streamFlushSpy).toHaveBeenCalledTimes(2);
  });

  it('handles SSE errors', () => {
    const sseError = createSSEInternalError('Invalid input');

    source$.error(sseError);

    jest.runAllTimers();

    expect(logger.error).toHaveBeenCalledWith(sseError);
    expect(logger.debug).toHaveBeenCalled();
    const debugFn = logger.debug.mock.calls[0][0] as () => string;
    const loggedError = JSON.parse(debugFn());
    expect(loggedError).toEqual({
      type: 'error',
      error: {
        code: ServerSentEventErrorCode.internalError,
        message: 'Invalid input',
        meta: {},
      },
    });

    expect(data).toEqual([
      `event: error\ndata: ${JSON.stringify({
        error: {
          code: ServerSentEventErrorCode.internalError,
          message: 'Invalid input',
          meta: {},
        },
      })}\n\n`,
    ]);
    expect(streamFlushSpy).toHaveBeenCalledTimes(1);
  });

  it('handles SSE errors with metadata', () => {
    const sseError = createSSERequestError('Invalid request', 400);

    source$.error(sseError);

    jest.runAllTimers();

    expect(logger.error).toHaveBeenCalledWith(sseError);
    expect(logger.debug).toHaveBeenCalled();
    const debugFn = logger.debug.mock.calls[0][0] as () => string;
    const loggedError = JSON.parse(debugFn());
    expect(loggedError).toEqual({
      type: 'error',
      error: {
        code: ServerSentEventErrorCode.requestError,
        message: 'Invalid request',
        meta: {
          status: 400,
        },
      },
    });

    expect(data).toEqual([
      `event: error\ndata: ${JSON.stringify({
        error: {
          code: ServerSentEventErrorCode.requestError,
          message: 'Invalid request',
          meta: {
            status: 400,
          },
        },
      })}\n\n`,
    ]);
    expect(streamFlushSpy).toHaveBeenCalledTimes(1);
  });

  it('handles non-SSE errors', () => {
    const error = new Error('Non-SSE Error');

    source$.error(error);

    jest.runAllTimers();

    expect(logger.error).toHaveBeenCalledWith(error);
    expect(data).toEqual([
      `event: error\ndata: ${JSON.stringify({
        error: {
          code: ServerSentEventErrorCode.internalError,
          message: 'Non-SSE Error',
        },
      })}\n\n`,
    ]);
  });

  it('should send keep-alive comments every 10 seconds', () => {
    jest.advanceTimersByTime(10000);
    expect(data.filter((d) => d === ': keep-alive\n')).toHaveLength(1);
    expect(streamFlushSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(10000);
    expect(data.filter((d) => d === ': keep-alive\n')).toHaveLength(2);
    expect(streamFlushSpy).toHaveBeenCalledTimes(2);
  });

  describe('without fake timers', () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['nextTick'] });
    });

    it('should end the stream when the observable completes', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick'] });

      const endSpy = jest.fn();
      stream.on('end', endSpy);

      source$.complete();

      await new Promise((resolve) => process.nextTick(resolve));

      expect(endSpy).toHaveBeenCalled();
      expect(streamFlushSpy).toHaveBeenCalledTimes(0);
    });

    it('should end stream when signal is aborted', async () => {
      const endSpy = jest.fn();
      stream.on('end', endSpy);

      // Emit some data
      source$.next({ type: ServerSentEventType.data, data: { initial: 'data' } });

      // Abort the signal
      controller.abort();

      // Emit more data after abort
      source$.next({ type: ServerSentEventType.data, data: { after: 'abort' } });

      await new Promise((resolve) => process.nextTick(resolve));

      expect(endSpy).toHaveBeenCalled();

      // Data after abort should not be received
      expect(data).toEqual([
        `event: data\ndata: ${JSON.stringify({ data: { initial: 'data' } })}\n\n`,
      ]);
      expect(streamFlushSpy).toHaveBeenCalledTimes(1);
    });

    afterEach(() => {
      jest.useFakeTimers();
    });
  });
});
