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

import { fork } from 'child_process';
import { resolve } from 'path';
import uuid from 'uuid/v4';

// If the worker doesn't response in 10s, kill it.
const WORKER_TIMEOUT = 20000;
const workerPath = resolve(__dirname, 'babeled.js');
const heap = {};
let worker = null;

export function getWorker() {
  if (worker) return worker;
  worker = fork(workerPath, {});

  // 'exit' happens whether we kill the worker or it just dies.
  // No need to look for 'error', our worker is intended to be long lived so it isn't running, it's an issue
  worker.on('exit', () => {
    // Heads up: there is no worker.off
    worker = null;
    // Restart immediately on exit since node takes a couple seconds to spin up
    worker = getWorker();
  });

  worker.on('message', msg => {
    const { type, value, id } = msg;
    if (type === 'run') {
      const { threadId } = msg;
      const { ast, context } = value;
      heap[threadId]
        .onFunctionNotFound(ast, context)
        .then(value => {
          worker.send({ type: 'msgSuccess', id, value: value });
        })
        .catch(e => heap[threadId].reject(e));
    }

    if (type === 'msgSuccess' && heap[id]) heap[id].resolve(value);

    // TODO: I don't think it is even possible to hit this
    if (type === 'msgError' && heap[id]) heap[id].reject(new Error(value));
  });

  return worker;
}

// All serialize/deserialize must occur in here. We should not return serialized stuff to the expressionRouter
export const thread = ({ onFunctionNotFound, serialize, deserialize }) => {
  const getWorkerFunctions = new Promise(resolve => {
    const worker = getWorker();
    worker.send({ type: 'getFunctions' });
    worker.on('message', msg => {
      if (msg.type === 'functionList') resolve(msg.value);
    });
  });

  return getWorkerFunctions.then(functions => {
    return {
      interpret: (ast, context) => {
        const worker = getWorker();
        const id = uuid();
        worker.send({ type: 'run', id, value: { ast, context: serialize(context) } });

        return new Promise((resolve, reject) => {
          heap[id] = {
            time: new Date().getTime(),
            resolve: value => {
              delete heap[id];
              resolve(deserialize(value));
            },
            reject: e => {
              delete heap[id];
              reject(e);
            },
            onFunctionNotFound: (ast, context) =>
              onFunctionNotFound(ast, deserialize(context)).then(serialize),
          };

          //
          setTimeout(() => {
            if (!heap[id]) return; // Looks like this has already been cleared from the heap.
            if (worker) worker.kill();

            // The heap will be cleared because the reject on heap will delete its own id
            heap[id].reject(new Error('Request timed out'));
          }, WORKER_TIMEOUT);
        });
      },

      getFunctions: () => functions,
    };
  });
};
