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

import _ from 'lodash';
import { filter, map } from 'rxjs/operators';
// eslint-disable-next-line
import { split } from '../../../../../plugins/bfetch/public/streaming';
import { BfetchPublicApi } from '../../../../../plugins/bfetch/public';
import { defer } from '../../../../../plugins/kibana_utils/public';
import { FUNCTIONS_URL } from './consts';

export interface Options {
  fetchStreaming: BfetchPublicApi['fetchStreaming'];
  serialize: any;
  ms?: number;
}

export type Batch = Record<string, BatchEntry>;

export interface BatchEntry {
  future: any;
  request: Request;
}

export interface Request {
  id?: number;
  functionName: string;
  args: any;
  context: string;
}

/**
 * Create a function which executes an Expression function on the
 * server as part of a larger batch of executions.
 */
export function batchedFetch({ fetchStreaming, serialize, ms = 10 }: Options) {
  // Uniquely identifies each function call in a batch operation
  // so that the appropriate promise can be resolved / rejected later.
  let id = 0;

  // A map like { id: { future, request } }, which is used to
  // track all of the function calls in a batch operation.
  let batch: Batch = {};
  let timeout: any;

  const nextId = () => ++id;

  const reset = () => {
    id = 0;
    batch = {};
    timeout = undefined;
  };

  const runBatch = () => {
    processBatch(fetchStreaming, batch);
    reset();
  };

  return ({ functionName, context, args }: any) => {
    if (!timeout) {
      timeout = setTimeout(runBatch, ms);
    }

    const request: Request = {
      functionName,
      args,
      context: serialize(context),
    };

    // Check to see if this is a duplicate server function.
    const duplicate: any = Object.values(batch).find((batchedRequest: any) =>
      _.isMatch(batchedRequest.request, request)
    );

    // If it is, just return the promise of the duplicated request.
    if (duplicate) {
      return duplicate.future.promise;
    }

    // If not, create a new promise, id, and add it to the batched collection.
    const future = defer();
    const newId = nextId();
    request.id = newId;

    batch[newId] = {
      future,
      request,
    };

    return future.promise;
  };
}

/**
 * Runs the specified batch of functions on the server, then resolves
 * the related promises.
 */
async function processBatch(fetchStreaming: BfetchPublicApi['fetchStreaming'], batch: Batch) {
  const { stream, promise } = fetchStreaming({
    url: FUNCTIONS_URL,
    body: JSON.stringify({
      functions: Object.values(batch).map(({ request }) => request),
    }),
  });

  stream
    .pipe(
      split('\n'),
      filter<string>(Boolean),
      map<string, any>((json: string) => JSON.parse(json))
    )
    .subscribe((message: any) => {
      const { id, statusCode, result } = message;
      const { future } = batch[id];

      if (statusCode >= 400) {
        future.reject(result);
      } else {
        future.resolve(result);
      }
    });

  try {
    await promise;
  } catch (error) {
    Object.values(batch).forEach(({ future }) => {
      future.reject(error);
    });
  }
}
