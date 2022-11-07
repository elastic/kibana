/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import https from 'https';
import { URL } from 'url';
import type { Request, ResponseToolkit } from '@hapi/hapi';
import nodeFetch, { RequestInit, Response } from 'node-fetch';
import type { IConfigService } from '@kbn/config';
import type { Logger } from '@kbn/logging';
import type { KibanaConfigType } from '../kibana_config';
import { KibanaConfig } from '../kibana_config';

const HTTPS = 'https:';

const GATEWAY_STATUS_ROUTE = '/api/status';
const KIBANA_STATUS_ROUTE = '/api/status';

interface StatusRouteDependencies {
  log: Logger;
  config: IConfigService;
}

type Fetch = (path: string) => Promise<Response>;

export function createStatusRoute({ config, log }: StatusRouteDependencies) {
  const kibanaConfig = new KibanaConfig(config.atPathSync<KibanaConfigType>('kibana'));
  const fetch = configureFetch(kibanaConfig);

  return {
    method: 'GET',
    path: GATEWAY_STATUS_ROUTE,
    handler: async (req: Request, h: ResponseToolkit) => {
      const responses = await fetchKibanaStatuses({ fetch, kibanaConfig, log });
      const { body, statusCode } = mergeStatusResponses(responses);
      return h.response(body).type('application/json').code(statusCode);
    },
  };
}

async function fetchKibanaStatuses({
  fetch,
  kibanaConfig,
  log,
}: {
  fetch: Fetch;
  kibanaConfig: KibanaConfig;
  log: Logger;
}) {
  const requests = await Promise.allSettled(
    kibanaConfig.hosts.map(async (host) => {
      log.debug(`Fetching response from ${host}${KIBANA_STATUS_ROUTE}`);
      const response = fetch(`${host}${KIBANA_STATUS_ROUTE}`).then((res) => res.json());
      return response;
    })
  );

  return requests.map((r, i) => {
    if (r.status === 'rejected') {
      log.error(`Unable to retrieve status from ${kibanaConfig.hosts[i]}${KIBANA_STATUS_ROUTE}`);
    } else {
      log.info(
        `Got response from ${kibanaConfig.hosts[i]}${KIBANA_STATUS_ROUTE}: ${JSON.stringify(
          r.value.status?.overall ? r.value.status.overall : r.value
        )}`
      );
    }
    return r;
  });
}

function mergeStatusResponses(
  responses: Array<PromiseFulfilledResult<Response> | PromiseRejectedResult>
) {
  let statusCode = 200;
  for (const response of responses) {
    if (response.status === 'rejected') {
      statusCode = 503;
    }
  }

  return {
    body: {}, // Need to determine what response body, if any, we want to include
    statusCode,
  };
}

function generateAgentConfig(sslConfig: KibanaConfig['ssl']) {
  const options: https.AgentOptions = {
    ca: sslConfig.certificateAuthorities,
    cert: sslConfig.certificate,
  };

  const verificationMode = sslConfig.verificationMode;
  switch (verificationMode) {
    case 'none':
      options.rejectUnauthorized = false;
      break;
    case 'certificate':
      options.rejectUnauthorized = true;
      // by default, NodeJS is checking the server identify
      options.checkServerIdentity = () => undefined;
      break;
    case 'full':
      options.rejectUnauthorized = true;
      break;
    default:
      throw new Error(`Unknown ssl verificationMode: ${verificationMode}`);
  }

  return options;
}

function configureFetch(kibanaConfig: KibanaConfig) {
  let agent: https.Agent;

  return async (url: string) => {
    const { protocol } = new URL(url);
    if (protocol === HTTPS && !agent) {
      agent = new https.Agent(generateAgentConfig(kibanaConfig.ssl));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      kibanaConfig.requestTimeout.asMilliseconds()
    );

    const fetchOptions: RequestInit = {
      ...(protocol === HTTPS && { agent }),
      signal: controller.signal,
    };
    try {
      const response = await nodeFetch(url, fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  };
}
