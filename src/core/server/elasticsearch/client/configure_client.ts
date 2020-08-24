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

import { stringify } from 'querystring';
import { Client } from '@elastic/elasticsearch';
import { Logger } from '../../logging';
import { parseClientOptions, ElasticsearchClientConfig } from './client_config';

export const configureClient = (
  config: ElasticsearchClientConfig,
  { logger, scoped = false }: { logger: Logger; scoped?: boolean }
): Client => {
  const clientOptions = parseClientOptions(config, scoped);

  const client = new Client(clientOptions);
  addLogging(client, logger, config.logQueries);

  return client;
};

const addLogging = (client: Client, logger: Logger, logQueries: boolean) => {
  client.on('response', (error, event) => {
    if (error) {
      const errorMessage =
        // error details for response errors provided by elasticsearch, defaults to error name/message
        `[${event.body?.error?.type ?? error.name}]: ${event.body?.error?.reason ?? error.message}`;

      logger.error(errorMessage);
    }
    if (event && logQueries) {
      const params = event.meta.request.params;

      // definition is wrong, `params.querystring` can be either a string or an object
      const querystring = convertQueryString(params.querystring);

      logger.debug(
        `${event.statusCode}\n${params.method} ${params.path}${
          querystring ? `\n${querystring}` : ''
        }`,
        {
          tags: ['query'],
        }
      );
    }
  });
};

const convertQueryString = (qs: string | Record<string, any> | undefined): string => {
  if (qs === undefined || typeof qs === 'string') {
    return qs ?? '';
  }
  return stringify(qs);
};
