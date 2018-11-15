/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';

export const browser = ({ socket, serialize, deserialize }) => {
  // Note that we need to be careful about how many times routeExpressionProvider is called, because of the socket.once below.
  // It's too bad we can't get a list of browser plugins on the server
  const getClientFunctions = new Promise(resolve => {
    socket.emit('getFunctionList');
    socket.once('functionList', resolve);
  });

  return getClientFunctions.then(functions => {
    return {
      interpret: (ast, context) => {
        return new Promise((resolve, reject) => {
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
      },
      getFunctions: () => Object.keys(functions),
    };
  });
};
