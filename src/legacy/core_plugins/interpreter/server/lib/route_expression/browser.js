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

import uuid from 'uuid/v4';

export const browser = ({ socket, serialize, deserialize }) => {
  // Note that we need to be careful about how many times routeExpressionProvider is called, because of the socket.once below.
  // It's too bad we can't get a list of browser plugins on the server

  let getFunctionsPromise;
  socket.on('updateFunctionList', () => {
    getFunctionsPromise = undefined;
  });

  const getFunctions = async () => {
    if (!getFunctionsPromise) {
      getFunctionsPromise = new Promise(resolve => {
        socket.once('functionList', resolve);
        socket.emit('getFunctionList');
      });
    }

    return Object.keys(await getFunctionsPromise);
  };

  return {
    interpret: (ast, context) => {
      return new Promise(async (resolve, reject) => {
        await getFunctions();
        const id = uuid();
        const listener = resp => {
          if (resp.type === 'msgError') {
            const { value } = resp;
            // cast error strings back into error instances
            const err = value instanceof Error ? value : new Error(value);
            if (value.stack) err.stack = value.stack;
            // Reject's with a legit error. Check! Environments should always reject with an error when something bad happens
            reject(err);
          } else {
            resolve(deserialize(resp.value));
          }
        };

        // {type: msgSuccess or msgError, value: foo}. Doesn't matter if it's success or error, we do the same thing for now
        socket.once(`resp:${id}`, listener);

        socket.emit('run', { ast, context: serialize(context), id });
      });
    }, getFunctions
  };
};
