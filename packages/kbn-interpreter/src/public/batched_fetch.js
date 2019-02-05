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

import { FUNCTIONS_URL } from './consts';

/**
 * Create a function which executes an Expression function on the
 * server as part of a larger batch of executions.
 */
export function batchedFetch({ kfetch, serialize, ms = 10 }) {
  // Uniquely identifies each function call in a batch operation
  // so that the appropriate promise can be resolved / rejected later.
  let id = 0;

  // A map like { id: { future, request } }, which is used to
  // track all of the function calls in a batch operation.
  let batch = {};
  let timeout;

  const nextId = () => ++id;

  const reset = () => {
    id = 0;
    batch = {};
    timeout = undefined;
  };

  const runBatch = () => {
    processBatch(kfetch, batch);
    reset();
  };

  return ({ functionName, context, args }) => {
    if (!timeout) {
      timeout = setTimeout(runBatch, ms);
    }

    const id = nextId();
    const future = createFuture();

    batch[id] = {
      future,
      request: { id, functionName, args, context: serialize(context) },
    };

    return future.promise;
  };
}

/**
 * An externally resolvable / rejectable promise, used to make sure
 * individual batch responses go to the correct caller.
 */
function createFuture() {
  let resolve;
  let reject;

  return {
    resolve(val) { return resolve(val); },
    reject(val) { return reject(val); },
    promise: new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    }),
  };
}

/**
 * Runs the specified batch of functions on the server, then resolves
 * the related promises.
 */
async function processBatch(kfetch, batch) {
  try {
    const { results } = await kfetch({
      pathname: FUNCTIONS_URL,
      method: 'POST',
      body: JSON.stringify({
        functions: Object.values(batch).map(({ request }) => request),
      }),
    });

    results.forEach(({ id, result }) => {
      const { future } = batch[id];
      if (result.statusCode && result.err) {
        future.reject(result);
      } else {
        future.resolve(result);
      }
    });
  } catch (err) {
    Object.values(batch).forEach(({ future }) => {
      future.reject(err);
    });
  }
}
