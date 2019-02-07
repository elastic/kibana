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
import { serializeProvider } from '@kbn/interpreter/common';
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
      validate: {
        payload: Joi.object({
          functions: Joi.array().items(
            Joi.object()
              .keys({
                id: Joi.number().required(),
                functionName: Joi.string().required(),
                args: Joi.object().default({}),
                context: Joi.object().default({}),
              }),
          ).required(),
        }).required(),
      },
    },
    async handler(req) {
      const handlers = await createHandlers(req, server);
      const { functions } = req.payload;

      // Process each function individually, and bundle up respones / errors into
      // the format expected by the front-end batcher.
      const results = await Promise.all(functions.map(async ({ id, ...fnCall }) => {
        const result = await runFunction(server, handlers, fnCall)
          .catch(err => {
            if (Boom.isBoom(err)) {
              return { err, statusCode: err.statusCode, message: err.output.payload };
            }
            return {  err: 'Internal Server Error', statusCode: 500, message: 'See server logs for details.' };
          });
        return { id, result };
      }));

      return { results };
    },
  });
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
      return server.plugins.interpreter.serverFunctions.toJS();
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
  const { functionName, args, context } = fnCall;
  const types = server.plugins.interpreter.types.toJS();
  const { deserialize } = serializeProvider(types);
  const fnDef = server.plugins.interpreter.serverFunctions.toJS()[functionName];

  if (!fnDef) {
    throw Boom.notFound(`Function "${functionName}" could not be found.`);
  }

  return fnDef.fn(deserialize(context), args, handlers);
}
