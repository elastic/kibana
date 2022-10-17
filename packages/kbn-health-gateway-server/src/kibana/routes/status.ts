/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import https from 'https';
import type { Request, ResponseToolkit } from '@hapi/hapi';
import nodeFetch, { RequestInit, Response } from 'node-fetch';
import type { IConfigService } from '@kbn/config';
import type { Logger } from '@kbn/logging';
import type { KibanaConfigType } from '../kibana_config';
import { KibanaConfig } from '../kibana_config';

const GATEWAY_STATUS_ROUTE = '/api/status';
const KIBANA_STATUS_ROUTE = '/api/status';

interface StatusRouteDependencies {
  log: Logger;
  config: IConfigService;
}

export function createStatusRoute({ config, log }: StatusRouteDependencies) {
  const kibanaConfig = new KibanaConfig(config.atPathSync<KibanaConfigType>('kibana'));

  return {
    method: 'GET',
    path: GATEWAY_STATUS_ROUTE,
    handler: async (req: Request, h: ResponseToolkit) => {
      const responses = await fetchKibanaStatuses(kibanaConfig, { log });
      const { body, statusCode } = mergeStatusResponses(responses);
      return h.response(body).type('application/json').code(statusCode);
    },
  };
}

async function fetchKibanaStatuses(kibanaConfig: KibanaConfig, { log }: { log: Logger }) {
  const fetch = configureFetch(kibanaConfig);
  const requests = await Promise.allSettled(
    kibanaConfig.hosts.map(async (host) => {
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
      const message = `Unable to retrieve status from [${kibanaConfig.hosts[i]}]: ${JSON.stringify(
        r
      )}`;
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
  return async (path: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      kibanaConfig.requestTimeout.asMilliseconds()
    );
    const fetchOptions: RequestInit = {
      agent: new https.Agent(generateAgentConfig(kibanaConfig.ssl)),
      signal: controller.signal,
    };
    try {
      const response = await nodeFetch(path, fetchOptions);
      clearTimeout(timeoutId);
      return response;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  };
}
