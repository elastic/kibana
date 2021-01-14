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

import querystring from 'querystring';
import { isBoom } from '@hapi/boom';
import type { Request } from '@hapi/hapi';
import numeral from '@elastic/numeral';
import { LogMeta } from '@kbn/logging';
import { EcsEvent } from './ecs';
import { getResponsePayloadBytes } from './get_payload_size';

/**
 * Converts a hapi `Request` into ECS-compliant `LogMeta` for logging.
 *
 * @internal
 */
export function getEcsResponseLog(request: Request): LogMeta {
  const { path, response } = request;
  const method = request.method.toUpperCase();

  const query = querystring.stringify(request.query);
  const pathWithQuery = query.length > 0 ? `${path}?${query}` : path;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const status_code = isBoom(response) ? response.output.statusCode : response.statusCode;

  // borrowed from the hapi/good implementation
  const responseTime = (request.info.completed || request.info.responded) - request.info.received;
  const responseTimeMsg = !isNaN(responseTime) ? ` ${responseTime}ms` : '';

  const bytes = getResponsePayloadBytes(response);
  const bytesMsg = bytes ? ` - ${numeral(bytes).format('0.0b')}` : '';

  const meta: EcsEvent = {
    ecs: { version: '1.7.0' },
    message: `${method} ${pathWithQuery} ${status_code}${responseTimeMsg}${bytesMsg}`,
    client: {
      ip: request.info.remoteAddress,
    },
    http: {
      request: {
        method,
        mime_type: request.mime,
        referrer: request.info.referrer,
      },
      response: {
        body: {
          bytes,
        },
        status_code,
      },
    },
    url: {
      path,
      query,
    },
    user_agent: {
      original: request.headers['user-agent'],
    },
  };

  // return ECS event with custom fields added
  return {
    ...meta,
    http: {
      ...meta.http,
      request: {
        ...meta.http!.request,
        // Headers are not yet part of ECS: https://github.com/elastic/ecs/issues/232.
        headers: Object.fromEntries(
          Object.entries(request.headers).filter(([key]) => {
            // We are excluding sensitive headers by default, until such a time
            // as we have a proper log filtering mechanism.
            const forbidden = ['authorization', 'cookie'];
            return !forbidden.includes(key.toLowerCase());
          })
        ),
      },
      response: {
        ...meta.http!.response,
        responseTime: !isNaN(responseTime) ? responseTime : undefined,
      },
    },
  };
}
