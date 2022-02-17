/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbortError, abortSignalToPromise, defer } from '../../../kibana_utils/public';
import {
  ItemBufferParams,
  TimedItemBufferParams,
  createBatchedFunction,
  ErrorLike,
  normalizeError,
} from '../../common';
import { fetchStreaming } from '../streaming';
import { BatchedFunc, BatchItem } from './types';

export interface BatchedFunctionProtocolError extends ErrorLike {
  code: string;
}

export interface StreamingBatchedFunctionParams<Payload, Result> {
  /**
   * URL endpoint that will receive a batch of requests. This endpoint is expected
   * to receive batch as a serialized JSON array. It should stream responses back
   * in ND-JSON format using `Transfer-Encoding: chunked` HTTP/1 streaming.
   */
  url: string;

  /**
   * The instance of `fetchStreaming` function that will perform ND-JSON handling.
   * There should be a version of this function available in setup contract of `bfetch`
   * plugin.
   */
  fetchStreaming?: typeof fetchStreaming;

  /**
   * The maximum size of function call buffer before sending the batch request.
   */
  flushOnMaxItems?: ItemBufferParams<any>['flushOnMaxItems'];

  /**
   * The maximum timeout in milliseconds of the oldest item in the batch
   * before sending the batch request.
   */
  maxItemAge?: TimedItemBufferParams<any>['maxItemAge'];

  /**
   * Disabled zlib compression of response chunks.
   */
  getIsCompressionDisabled?: () => boolean;
}

/**
 * Returns a function that does not execute immediately but buffers the call internally until
 * `params.flushOnMaxItems` is reached or after `params.maxItemAge` timeout in milliseconds is reached. Once
 * one of those thresholds is reached all buffered calls are sent in one batch to the
 * server using `params.fetchStreaming` in a POST request. Responses are streamed back
 * and each batch item is resolved once corresponding response is received.
 */
export const createStreamingBatchedFunction = <Payload, Result extends object>(
  params: StreamingBatchedFunctionParams<Payload, Result>
): BatchedFunc<Payload, Result> => {
  const {
    url,
    fetchStreaming: fetchStreamingInjected = fetchStreaming,
    flushOnMaxItems = 25,
    maxItemAge = 10,
    getIsCompressionDisabled = () => false,
  } = params;
  const [fn] = createBatchedFunction({
    onCall: (payload: Payload, signal?: AbortSignal) => {
      const future = defer<Result>();
      const entry: BatchItem<Payload, Result> = {
        payload,
        future,
        signal,
      };
      return [future.promise, entry];
    },
    onBatch: async (items) => {
      try {
        // Filter out any items whose signal is already aborted
        items = items.filter((item) => {
          if (item.signal?.aborted) item.future.reject(new AbortError());
          return !item.signal?.aborted;
        });

        const donePromises: Array<Promise<any>> = items.map((item) => {
          return new Promise<void>((resolve) => {
            const { promise: abortPromise, cleanup } = item.signal
              ? abortSignalToPromise(item.signal)
              : {
                  promise: undefined,
                  cleanup: () => {},
                };

            const onDone = () => {
              resolve();
              cleanup();
            };
            if (abortPromise)
              abortPromise.catch(() => {
                item.future.reject(new AbortError());
                onDone();
              });
            item.future.promise.then(onDone, onDone);
          });
        });

        // abort when all items were either resolved, rejected or aborted
        const abortController = new AbortController();
        let isBatchDone = false;
        Promise.all(donePromises).then(() => {
          isBatchDone = true;
          abortController.abort();
        });
        const batch = items.map((item) => item.payload);

        const { stream } = fetchStreamingInjected({
          url,
          body: JSON.stringify({ batch }),
          method: 'POST',
          signal: abortController.signal,
          getIsCompressionDisabled,
        });

        const handleStreamError = (error: any) => {
          const normalizedError = normalizeError<BatchedFunctionProtocolError>(error);
          normalizedError.code = 'STREAM';
          for (const { future } of items) future.reject(normalizedError);
        };

        stream.subscribe({
          next: (json: string) => {
            try {
              const response = JSON.parse(json);
              if (response.error) {
                items[response.id].future.reject(response.error);
              } else if (response.result !== undefined) {
                items[response.id].future.resolve(response.result);
              }
            } catch (e) {
              handleStreamError(e);
            }
          },
          error: handleStreamError,
          complete: () => {
            if (!isBatchDone) {
              const error: BatchedFunctionProtocolError = {
                message: 'Connection terminated prematurely.',
                code: 'CONNECTION',
              };
              for (const { future } of items) future.reject(error);
            }
          },
        });
        await stream.toPromise();
      } catch (error) {
        for (const item of items) item.future.reject(error);
      }
    },
    flushOnMaxItems,
    maxItemAge,
  });

  return fn;
};
