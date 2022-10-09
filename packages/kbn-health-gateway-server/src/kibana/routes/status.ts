/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Request, ResponseToolkit } from '@hapi/hapi';
import fetch, { Response } from 'node-fetch';
import type { IConfigService } from '@kbn/config';
import type { Logger } from '@kbn/logging';
import type { KibanaConfigType } from '../kibana_config';

const GATEWAY_STATUS_ROUTE = '/api/status';
const KIBANA_STATUS_ROUTE = '/api/status';

interface StatusRouteDependencies {
  log: Logger;
  config: IConfigService;
}

export function createStatusRoute({ config, log }: StatusRouteDependencies) {
  return {
    method: 'GET',
    path: GATEWAY_STATUS_ROUTE,
    handler: async (req: Request, h: ResponseToolkit) => {
      const responses = await fetchKibanaStatuses(
        config.atPathSync<KibanaConfigType>('kibana').hosts,
        { log }
      );
      const { body, statusCode } = mergeStatusResponses(responses);
      return h.response(body).type('application/json').code(statusCode);
    },
  };
}

async function fetchKibanaStatuses(hosts: string[], { log }: { log: Logger }) {
  const requests = await Promise.allSettled(
    hosts.map(async (host) => {
      log.debug(`Fetching response from ${host}${KIBANA_STATUS_ROUTE}`);
      const response = await fetch(`${host}${KIBANA_STATUS_ROUTE}`);
      const responseJson = await response.json();
      log.info(
        `Got response from ${host}${KIBANA_STATUS_ROUTE}: ${JSON.stringify(
          responseJson.status.overall
        )}`
      );
      return response;
    })
  );

  return requests.map((r, i) => {
    if (r.status === 'fulfilled') {
      return r.value;
    } else {
      const message = `Unable to retrieve status from [${hosts[i]}]: ${JSON.stringify(r.reason)}`;
      log.error(message);
      throw new Error(message);
    }
  });
}

function mergeStatusResponses(responses: Response[]) {
  // For now we're being super naïve and returning the highest status code
  const statusCode = responses.reduce((acc, cur) => (cur.status > acc ? cur.status : acc), 0);

  return {
    body: {}, // Need to determine what response body, if any, we want to include
    statusCode,
  };
}
