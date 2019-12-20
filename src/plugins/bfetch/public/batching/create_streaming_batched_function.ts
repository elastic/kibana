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

import { defer, Defer } from 'src/plugins/kibana_utils/public';
import {
  ItemBufferParams,
  TimedItemBufferParams,
  createBatchedFunction,
  BatchResponseItem,
  ErrorLike,
} from '../../common';
import { fetchStreaming } from '../streaming';

export interface StreamingBatchedFunctionParams<Payload, Result> {
  url: string;
  fetchStreaming?: typeof fetchStreaming;
  flushOnMaxItems?: ItemBufferParams<any>['flushOnMaxItems'];
  maxItemAge?: TimedItemBufferParams<any>['maxItemAge'];
}

export interface BatchItem<Payload, Result> {
  payload: Payload;
  future: Defer<Result>;
}

export type BatchedFunc<Payload, Result> = (payload: Payload) => Promise<Result>;

export const createStreamingBatchedFunction = <
  Payload,
  Result extends object,
  E extends ErrorLike = ErrorLike
>(
  params: StreamingBatchedFunctionParams<Payload, Result>
): BatchedFunc<Payload, Result> => {
  const {
    url,
    fetchStreaming: fetchStreamingInjected = fetchStreaming,
    flushOnMaxItems = 25,
    maxItemAge = 10,
  } = params;
  const [fn] = createBatchedFunction<BatchedFunc<Payload, Result>, BatchItem<Payload, Result>>({
    onCall: (payload: Payload) => {
      const future = defer<Result>();
      const entry: BatchItem<Payload, Result> = {
        payload,
        future,
      };
      return [future.promise, entry];
    },
    onBatch: async items => {
      try {
        const { promise, stream } = fetchStreamingInjected({
          url,
          body: JSON.stringify(items),
          method: 'POST',
        });
        stream.subscribe(json => {
          const response = JSON.parse(json) as BatchResponseItem<Result, E>;
          if (response.error) {
            const error = new Error(response.error.message);
            for (const [key, value] of Object.entries(response.error)) (error as any)[key] = value;
            items[response.id].future.reject(error);
          } else if (response.result) {
            items[response.id].future.resolve(response.result);
          }
        });
        await promise;
      } catch (error) {
        for (const item of items) item.future.reject(error);
      }
    },
    flushOnMaxItems,
    maxItemAge,
  });

  return fn;
};
