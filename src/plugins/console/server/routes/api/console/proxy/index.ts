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

import { IRouter, KibanaRequest } from 'kibana/server';
import { schema } from '@kbn/config-schema';
import * as url from 'url';
import { IncomingMessage } from 'http';
import Boom from 'boom';
import { trimLeft, trimRight } from 'lodash';
import { ProxyConfigCollection, proxyRequest } from '../../../../lib';

function toURL(base: string, path: string) {
  const urlResult = new url.URL(`${trimRight(base, '/')}/${trimLeft(path, '/')}`);
  // Appending pretty here to have Elasticsearch do the JSON formatting, as doing
  // in JS can lead to data loss (7.0 will get munged into 7, thus losing indication of
  // measurement precision)
  if (!urlResult.searchParams.get('pretty')) {
    urlResult.searchParams.append('pretty', 'true');
  }
  return urlResult;
}

function getRequestConfig() {}

function getProxyHeaders(req: KibanaRequest) {
  const headers = Object.create(null);

  // Scope this proto-unsafe functionality to where it is being used.
  function extendCommaList(obj: Record<string, any>, property: string, value: any) {
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

export const registerProxyRoute = ({
  router,
  readLegacyESConfig,
  pathFilters = [/.*/],
}: {
  router: IRouter;
  readLegacyESConfig: () => {
    hosts: string[];
    requestHeadersWhitelist: string[];
    customHeaders: Record<string, any>;
  };
  pathFilters: RegExp[];
  proxyConfigCollection: ProxyConfigCollection;
}) => {
  router.post(
    {
      path: '/api/console/proxy',
      options: {
        tags: ['access:console'],
        body: {
          output: 'stream',
          parse: false,
        },
      },
      validate: {
        query: schema.object({
          method: schema.oneOf([
            schema.literal('HEAD'),
            schema.literal('GET'),
            schema.literal('POST'),
            schema.literal('PUT'),
            schema.literal('DELETE'),
          ]),
          path: schema.string(),
        }),
        body: schema.stream(),
      },
    },
    async (ctx, request, response) => {
      const { body, query } = request;
      const { path, method } = query;

      if (!pathFilters.some(re => re.test(path))) {
        return response.forbidden({
          body: `Error connecting to '${path}':\n\nUnable to send requests to that path.`,
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      }

      const { hosts } = readLegacyESConfig();

      let esIncomingMessage: IncomingMessage;

      for (let idx = 0; idx < hosts.length; ++idx) {
        const host = hosts[idx];
        try {
          const uri = toURL(host, path);

          // Because this can technically be provided by a settings-defined proxy config, we need to
          // preserve these property names to maintain BWC.
          // const { timeout, agent, headers, rejectUnauthorized } = getConfigForReq(
          //   request,
          //   uri.toString()
          // );

          const requestHeaders = {
            ...headers,
            ...getProxyHeaders(request),
          };

          esIncomingMessage = await proxyRequest({
            method: method.toLowerCase() as any,
            headers: requestHeaders,
            uri,
            // timeout,
            payload: body,
            // rejectUnauthorized,
            // agent,
          });

          break;
        } catch (e) {
          if (e.code !== 'ECONNREFUSED') {
            throw Boom.boomify(e);
          }
          if (idx === hosts.length - 1) {
            throw Boom.badGateway('Could not reach any configured nodes.');
          }
          // Otherwise, try the next host...
        }
      }

      const {
        statusCode,
        statusMessage,
        headers: { warning },
      } = esIncomingMessage!;

      if (method.toUpperCase() !== 'HEAD') {
        return response.custom({
          statusCode: statusCode!,
          body: esIncomingMessage!,
          headers: {
            warning: warning || '',
          },
        });
      }

      return response.custom({
        statusCode: statusCode!,
        body: `${statusCode} - ${statusMessage}`,
        headers: {
          warning: warning || '',
          'Content-Type': 'text/plain',
        },
      });
    }
  );
};
