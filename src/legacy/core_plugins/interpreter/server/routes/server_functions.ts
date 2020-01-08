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
import Joi from 'joi';
import { serializeProvider } from '../../../../../plugins/expressions/common';
import { createHandlers } from '../lib/create_handlers';

const API_ROUTE = '/api/interpreter';

/**
 * Register the Canvas function endopints.
 *
 * @param {*} server - The Kibana server
 */
export function registerServerFunctions(server: any) {
  getServerFunctions(server);
  runServerFunctions(server);
}

/**
 * Register the endpoint that executes a batch of functions, and sends the result back as a single response.
 *
 * @param {*} server - The Kibana server
 */
function runServerFunctions(server: any) {
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
          functions: Joi.array()
            .items(
              Joi.object().keys({
                id: Joi.number().required(),
                functionName: Joi.string().required(),
                args: Joi.object().default({}),
                context: Joi.any().default(null),
              })
            )
            .required(),
        }).required(),
      },
    },
    async handler(req: any) {
      const handlers = await createHandlers(req, server);
      const { functions } = req.payload;

      // Grab the raw Node response object.
      const res = req.raw.res;

      // Tell Hapi not to manage the response https://github.com/hapijs/hapi/issues/3884
      req._isReplied = true;

      // Send the initial headers.
      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        Connection: 'keep-alive',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      });

      // Write a length-delimited response
      const streamResult = (result: any) => {
        res.write(JSON.stringify(result) + '\n');
      };

      // Tries to run an interpreter function, and ensures a consistent error payload on failure.
      const tryFunction = async (id: any, fnCall: any) => {
        try {
          const result = await runFunction(server, handlers, fnCall);

          if (typeof result === 'undefined') {
            return batchError(id, `Function ${fnCall.functionName} did not return anything.`);
          }

          return { id, statusCode: 200, result };
        } catch (err) {
          if (Boom.isBoom(err)) {
            return batchError(id, err.output.payload, (err as any).statusCode);
          } else if (err instanceof Error) {
            return batchError(id, err.message);
          }

          server.log(['interpreter', 'error'], err);
          return batchError(id, 'See server logs for details.');
        }
      };

      // Process each function individually, and stream the responses back to the client
      await Promise.all(
        functions.map(({ id, ...fnCall }: any) => tryFunction(id, fnCall).then(streamResult))
      );

      // All of the responses have been written, so we can close the response.
      res.end();
    },
  });
}

/**
 * A helper function for bundling up errors.
 */
function batchError(id: any, message: any, statusCode = 500) {
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
function getServerFunctions(server: any) {
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
async function runFunction(server: any, handlers: any, fnCall: any) {
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
