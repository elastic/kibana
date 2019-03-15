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

import Boom from 'boom';
import { serializeProvider } from '../../common/serialize';
import { API_ROUTE } from '../../common/constants';
import { createHandlers } from '../lib/create_handlers';
import Joi from 'joi';

/**
 * Register the Canvas function endopints.
 *
 * @param {*} server - The Kibana server
 */
export function registerServerFunctions(server) {
  getServerFunctions(server);
  runServerFunctions(server);
}

/**
 * Register the endpoint that executes a batch of functions, and sends the result back as a single response.
 *
 * @param {*} server - The Kibana server
 */
function runServerFunctions(server) {
  server.route({
    method: 'POST',
    path: `${API_ROUTE}/fns`,
    options: {
      payload: {
        allow: 'application/json',
        maxBytes: 26214400, // 25MB payload limit
      },
      validate: {
        payload: Joi.object({
          functions: Joi.array().items(
            Joi.object()
              .keys({
                id: Joi.number().required(),
                functionName: Joi.string().required(),
                args: Joi.object().default({}),
                context: Joi.object().allow(null).default({}),
              }),
          ).required(),
        }).required(),
      },
    },
    async handler(req) {
      const handlers = await createHandlers(req, server);
      const { functions } = req.payload;

      // Grab the raw Node response object.
      const res = req.raw.res;

      // Tell Hapi not to manage the response https://github.com/hapijs/hapi/issues/3884
      req._isReplied = true;

      // Send the initial headers.
      res.writeHead(200, {
        'Content-Type': 'text/plain',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      });

      // Write a length-delimited response
      const streamResult = (result) => {
        const payload = JSON.stringify(result) + '\n';
        res.write(`${payload.length}:${payload}`);
      };

      // Tries to run an interpreter function, and ensures a consistent error payload on failure.
      const tryFunction = async (id, fnCall) => {
        try {
          const result = await runFunction(server, handlers, fnCall);

          if (typeof result === 'undefined') {
            return batchError(id, `Function ${fnCall.functionName} did not return anything.`);
          }

          return { id, statusCode: 200, result };
        } catch (err) {
          if (Boom.isBoom(err)) {
            return batchError(id, err.output.payload, err.statusCode);
          } else if (err instanceof Error) {
            return batchError(id, err.message);
          }

          server.log(['interpreter', 'error'], err);
          return batchError(id, 'See server logs for details.');
        }
      };

      // Process each function individually, and stream the responses back to the client
      await Promise.all(functions.map(({ id, ...fnCall }) => tryFunction(id, fnCall).then(streamResult)));

      // All of the responses have been written, so we can close the response.
      res.end();
    },
  });
}

/**
 * A helper function for bundling up errors.
 */
function batchError(id, message, statusCode = 500) {
  return {
    id,
    statusCode,
    result: { statusCode, message },
  };
}

/**
 * Register the endpoint that returns the list of server-only functions.
 * @param {*} server - The Kibana server
 */
function getServerFunctions(server) {
  server.route({
    method: 'GET',
    path: `${API_ROUTE}/fns`,
    handler() {
      return server.plugins.interpreter.registries().serverFunctions.toJS();
    },
  });
}

/**
 * Run a single Canvas function.
 *
 * @param {*} server - The Kibana server object
 * @param {*} handlers - The Canvas handlers
 * @param {*} fnCall - Describes the function being run `{ functionName, args, context }`
 */
async function runFunction(server, handlers, fnCall) {
  const registries = server.plugins.interpreter.registries();
  const { functionName, args, context } = fnCall;
  const types = registries.types.toJS();
  const { deserialize } = serializeProvider(types);
  const fnDef = registries.serverFunctions.toJS()[functionName];

  if (!fnDef) {
    throw Boom.notFound(`Function "${functionName}" could not be found.`);
  }

  return fnDef.fn(deserialize(context), args, handlers);
}
