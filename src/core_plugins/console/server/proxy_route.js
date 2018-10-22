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
import Wreck from 'wreck';
import { trimLeft, trimRight } from 'lodash';

function resolveUri(base, path) {
  let pathToUse = `${trimRight(base, '/')}/${trimLeft(path, '/')}`;
  const questionMarkIndex = pathToUse.indexOf('?');
  // no query string in pathToUse, append '?pretty'
  if (questionMarkIndex === -1) {
    pathToUse = `${pathToUse}?pretty`;
  } else {
    // pathToUse has query string, append '&pretty'
    pathToUse = `${pathToUse}&pretty`;
  }
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
    extendCommaList(headers, 'x-forwarded-proto', req.connection.info.protocol);
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
    payload: {
      output: 'stream',
      parse: false
    },

    validate: {
      query: Joi.object().keys({
        method: Joi.string()
          .valid('HEAD', 'GET', 'POST', 'PUT', 'DELETE')
          .insensitive()
          .required(),
        path: Joi.string().required()
      }).unknown(true),
    },

    pre: [
      function filterPath(req, reply) {
        const { path } = req.query;

        if (!pathFilters.some(re => re.test(path))) {
          const err = Boom.forbidden();
          err.output.payload = `Error connecting to '${path}':\n\nUnable to send requests to that path.`;
          err.output.headers['content-type'] = 'text/plain';
          reply(err);
        } else {
          reply();
        }
      },
    ],

    handler(req, reply) {
      const { payload, query } = req;
      const { path, method } = query;
      const uri = resolveUri(baseUrl, path);

      const {
        timeout,
        rejectUnauthorized,
        agent,
        headers,
      } = getConfigForReq(req, uri);

      const wreckOptions = {
        payload,
        timeout,
        rejectUnauthorized,
        agent,
        headers: {
          ...headers,
          ...getProxyHeaders(req)
        },
      };

      Wreck.request(method, uri, wreckOptions, (err, esResponse) => {
        if (err) {
          return reply(err);
        }

        if (method.toUpperCase() !== 'HEAD') {
          reply(esResponse)
            .code(esResponse.statusCode)
            .header('warning', esResponse.headers.warning);
          return;
        }

        reply(`${esResponse.statusCode} - ${esResponse.statusMessage}`)
          .code(esResponse.statusCode)
          .type('text/plain')
          .header('warning', esResponse.headers.warning);
      });
    }
  }
});
