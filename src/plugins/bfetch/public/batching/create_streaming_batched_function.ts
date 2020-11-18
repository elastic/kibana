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

import { AbortError, defer } from '../../../kibana_utils/public';
import {
  ItemBufferParams,
  TimedItemBufferParams,
  createBatchedFunction,
  BatchResponseItem,
  ErrorLike,
} from '../../common';
import { fetchStreaming, split } from '../streaming';
import { normalizeError } from '../../common';
import { BatchedFunc, BatchItem } from './types';
import { isBatchDone, getDonePromise } from './batch_utils';

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
  } = params;
  const [fn] = createBatchedFunction<BatchedFunc<Payload, Result>, BatchItem<Payload, Result>>({
    onCall: (payload: Payload, signal?: AbortSignal) => {
      const future = defer<Result>();
      const entry: BatchItem<Payload, Result> = {
        payload,
        future,
        signal,
        done: false,
      };
      return [future.promise, entry];
    },
    onBatch: async (items) => {
      try {
        const promises: Array<Promise<void>> = [];
        const abortController = new AbortController();

        // Filter out and reject any items who's signal is already aborted
        items = items.filter((item) => {
          if (item.signal?.aborted) {
            item.future.reject(new AbortError());
          }
          return !item.signal?.aborted;
        });

        // Prepare batch
        const batch = items.map((item) => {
          // Subscribe to reject promise on abort
          const rejectAborted = () => {
            item.future.reject(new AbortError());
            item.signal?.removeEventListener('abort', rejectAborted);
          };
          item.signal?.addEventListener('abort', rejectAborted);

          // Track batch progress
          promises.push(getDonePromise(item));

          // Return payload to be sent
          return item.payload;
        });

        // abort when all items were either resolved, rejected or aborted
        Promise.all(promises).then(() => abortController.abort());

        const { stream } = fetchStreamingInjected({
          url,
          body: JSON.stringify({ batch }),
          method: 'POST',
          signal: abortController.signal,
        });
        stream.pipe(split('\n')).subscribe({
          next: (json: string) => {
            const response = JSON.parse(json) as BatchResponseItem<Result, ErrorLike>;
            if (response.error) {
              items[response.id].future.reject(response.error);
            } else if (response.result !== undefined) {
              items[response.id].future.resolve(response.result);
            }
          },
          error: (error) => {
            const normalizedError = normalizeError<BatchedFunctionProtocolError>(error);
            normalizedError.code = 'STREAM';
            for (const { future } of items) future.reject(normalizedError);
          },
          complete: () => {
            const streamTerminatedPrematurely = !isBatchDone(items);
            if (streamTerminatedPrematurely) {
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
