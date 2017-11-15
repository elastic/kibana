import _ from 'lodash';
import uuid from 'uuid/v4';
import { interpretProvider } from './interpret';

/*
  Returns an interpet function that can shuttle partial ASTs and context between instances of itself over a socket
  This is the interpreter that gets called during interactive sessions in the browser and communicates with the
  same instance on the backend

  types: a registry of types
  functions: registry of known functions
  referableFunctions: An array, or a promise for an array, with a list of functions that are available to be defered to
  socket: the socket to communicate over
*/

export function socketInterpreterProvider({ types, functions, handlers, referableFunctions, socket }) {
  // Return the interpet() function
  return interpretProvider({
    types, functions, handlers,

    onFunctionNotFound: (chain, context) => {
      // Get the name of the function that wasn't found
      const functionName = chain.chain[0].function;

      // Get the list of functions that are known elsewhere
      return Promise.resolve(referableFunctions).then((referableFunctionMap) => {
        // Check if the not-found function is in the list of alternatives, if not, throw
        if (!_.has(referableFunctionMap, functionName)) throw new Error(`Function not found: ${functionName}`);

        // Keep a counter so we understand what message ID we're on. We might need a UUID at some point for when we're
        // resolving multiple expressions
        const id = uuid();

        return new Promise((resolve, reject) => {
          const listener = (resp) => {
            // Resolve or reject the promise once we get our ID back
            if (resp.id === id) {
              socket.removeListener('resp', listener);

              if (resp.error) {
                // cast error strings back into error instances
                const err = (resp.error instanceof Error) ? resp.error : new Error(resp.error);
                if (resp.stack) err.stack = resp.stack;
                reject(err);
              } else {
                resolve(resp.value);
              }
            }
          };

          socket.on('resp', listener);

          // Go run the remaining AST and context somewhere else, meaning either the browser or the server, depending on
          // where this file was loaded
          socket.emit('run', { ast: chain, context: context, id: id });
        });
      });
    },
  });
}
