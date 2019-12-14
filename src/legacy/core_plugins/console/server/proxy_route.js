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
import { sendRequest } from './request';
import * as url from 'url';

function toURL(base, path) {
  const urlResult = new url.URL(`${trimRight(base, '/')}/${trimLeft(path, '/')}`);
  // Appending pretty here to have Elasticsearch do the JSON formatting, as doing
  // in JS can lead to data loss (7.0 will get munged into 7, thus losing indication of
  // measurement precision)
  if (!urlResult.searchParams.get('pretty')) {
    urlResult.searchParams.append('pretty', 'true');
  }
  return urlResult;
}

function getProxyHeaders(req) {
  const headers = Object.create(null);

  // Scope this proto-unsafe functionality to where it is being used.
  function extendCommaList(obj, property, value) {
    obj[property] = (obj[property] ? obj[property] + ',' : '') + value;
  }

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
    payload: {
      output: 'stream',
      parse: false,
    },
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
      const uri = toURL(baseUrl, path);

      // Because this can technically be provided by a settings-defined proxy config, we need to
      // preserve these property names to maintain BWC.
      const { timeout, agent, headers, rejectUnauthorized } = getConfigForReq(req, uri.toString());

      const requestHeaders = {
        ...headers,
        ...getProxyHeaders(req),
      };

      const esIncomingMessage = await sendRequest({
        method,
        headers: requestHeaders,
        uri,
        timeout,
        payload,
        rejectUnauthorized,
        agent,
      });

      const { statusCode, statusMessage, headers: responseHeaders } = esIncomingMessage;

      const { warning } = responseHeaders;

      if (method.toUpperCase() !== 'HEAD') {
        return h
          .response(esIncomingMessage)
          .code(statusCode)
          .header('warning', warning);
      } else {
        return h
          .response(`${statusCode} - ${statusMessage}`)
          .code(statusCode)
          .type('text/plain')
          .header('warning', warning);
      }
    },
  },
});
