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

import Joi from 'joi';
import Boom from 'boom';
import { trimLeft, trimRight } from 'lodash';
import request from 'request';
import { parse } from 'querystring';

function resolveUri(base, path) {
  let pathToUse = `${trimRight(base, '/')}/${trimLeft(path, '/')}`;
  const questionMarkIndex = pathToUse.indexOf('?');
  // no query string in pathToUse, append '?pretty'
  if (questionMarkIndex === -1) {
    pathToUse = `${pathToUse}?pretty`;
  } else {
    // pathToUse has query string, append '&pretty'
    pathToUse = `${pathToUse}&pretty`;
  } // appending pretty here to have Elasticsearch do the JSON formatting, as doing
  // in JS can lead to data loss (7.0 will get munged into 7, thus losing indication of
  // measurement precision)
  return pathToUse;
}

function extendCommaList(obj, property, value) {
  obj[property] = (obj[property] ? obj[property] + ',' : '') + value;
}

function getProxyHeaders(req) {
  const headers = {};

  if (req.info.remotePort && req.info.remoteAddress) {
    // see https://git.io/vytQ7
    extendCommaList(headers, 'x-forwarded-for', req.info.remoteAddress);
    extendCommaList(headers, 'x-forwarded-port', req.info.remotePort);
    extendCommaList(headers, 'x-forwarded-proto', req.server.info.protocol);
    extendCommaList(headers, 'x-forwarded-host', req.info.host);
  }

  const contentType = req.headers['content-type'];
  if (contentType) {
    headers['content-type'] = contentType;
  }
  return headers;
}

export const createProxyRoute = ({
  baseUrl = '/',
  pathFilters = [/.*/],
  getConfigForReq = () => ({}),
}) => ({
  path: '/api/console/proxy',
  method: 'POST',
  config: {
    tags: ['access:console'],

    validate: {
      query: Joi.object()
        .keys({
          method: Joi.string()
            .valid('HEAD', 'GET', 'POST', 'PUT', 'DELETE')
            .insensitive()
            .required(),
          path: Joi.string().required(),
        })
        .unknown(true),
    },

    pre: [
      function filterPath(req) {
        const { path } = req.query;

        if (pathFilters.some(re => re.test(path))) {
          return null;
        }

        const err = Boom.forbidden();
        err.output.payload = `Error connecting to '${path}':\n\nUnable to send requests to that path.`;
        err.output.headers['content-type'] = 'text/plain';
        throw err;
      },
    ],

    handler: async (req, h) => {
      const { payload, query } = req;
      const { path, method } = query;
      const uri = resolveUri(baseUrl, path);

      // Because this can technically be provided by a settings-defined proxy config, we need to
      // preserve these property names to maintain BWC.
      const { timeout, rejectUnauthorized, agent, headers } = getConfigForReq(req, uri);

      return await new Promise((resolve) => {
        const pathParts = path.split('?'); // TODO: Ensure this only has 2 parts
        const requestHeaders = {
          ...headers,
          ...getProxyHeaders(req),
        };

        // We use the request library because Hapi, Axios, and Superagent don't support GET requests
        // with bodies, but ES APIs do. Similarly with DELETE requests with bodiese. If we need to
        // deprecate use of this library, we can also solve this issue with Node's http library.
        // See #39170 for details.
        request({
          method,
          uri,
          timeout,
          qs: parse(pathParts[1] || ''),
          headers: requestHeaders,
          body: payload ? JSON.stringify(payload) : undefined,
          // agentOptions,
        }, (error, response, body) => {
          const {
            statusCode,
            statusMessage,
            headers: { warning },
          } = response;

          let result;

          if (method.toUpperCase() !== 'HEAD') {
            result = h
              .response(body)
              .code(statusCode)
              .header('warning', warning);
          } else {
            result = h
              .response(`${statusCode} - ${statusMessage}`)
              .code(statusCode)
              .type('text/plain')
              .header('warning', warning);
          }

          resolve(result);
        });
      });
    },
  },
});
