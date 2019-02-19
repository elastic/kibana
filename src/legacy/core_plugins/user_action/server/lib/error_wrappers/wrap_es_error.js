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

function extractCausedByChain(causedBy = {}, accumulator = []) {
  const { reason, caused_by } = causedBy; // eslint-disable-line camelcase

  if (reason) {
    accumulator.push(reason);
  }

  if (caused_by) { // eslint-disable-line camelcase
    return extractCausedByChain(caused_by, accumulator);
  }

  return accumulator;
}

/**
 * Wraps an error thrown by the ES JS client into a Boom error response and returns it
 *
 * @param err Object Error thrown by ES JS client
 * @param statusCodeToMessageMap Object Optional map of HTTP status codes => error messages
 * @return Object Boom error response
 */
export function wrapEsError(err, statusCodeToMessageMap = {}) {
  const {
    statusCode,
    response,
  } = err;

  const {
    error: {
      root_cause = [], // eslint-disable-line camelcase
      caused_by, // eslint-disable-line camelcase
    } = {},
  } = JSON.parse(response);

  // If no custom message if specified for the error's status code, just
  // wrap the error as a Boom error response and return it
  if (!statusCodeToMessageMap[statusCode]) {
    const boomError = Boom.boomify(err, { statusCode });

    // The caused_by chain has the most information so use that if it's available. If not then
    // settle for the root_cause.
    const causedByChain = extractCausedByChain(caused_by);
    const defaultCause = root_cause.length ? extractCausedByChain(root_cause[0]) : undefined;

    boomError.output.payload.cause = causedByChain.length ? causedByChain : defaultCause;
    return boomError;
  }

  // Otherwise, use the custom message to create a Boom error response and
  // return it
  const message = statusCodeToMessageMap[statusCode];
  return new Boom(message, { statusCode });
}
