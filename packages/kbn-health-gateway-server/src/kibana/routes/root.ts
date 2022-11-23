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
import { KibanaConfig } from '../kibana_config';

const HTTPS = 'https:';

const GATEWAY_ROOT_ROUTE = '/';
const KIBANA_ROOT_ROUTE = '/';

interface RootRouteDependencies {
  logger: Logger;
  config: IConfigService;
}

type Fetch = (path: string) => Promise<Response>;

export function createRootRoute({ config, logger }: RootRouteDependencies) {
  const kibanaConfig = new KibanaConfig({ config, logger });
  const fetch = configureFetch(kibanaConfig);

  return {
    method: 'GET',
    path: GATEWAY_ROOT_ROUTE,
    handler: async (req: Request, h: ResponseToolkit) => {
      const responses = await fetchKibanaRoots({ fetch, kibanaConfig, logger });
      const { body, statusCode } = mergeResponses(responses);
      logger.debug(`Returning ${statusCode} response with body: ${JSON.stringify(body)}`);

      return h.response(body).type('application/json').code(statusCode);
    },
  };
}

async function fetchKibanaRoots({
  fetch,
  kibanaConfig,
  logger,
}: {
  fetch: Fetch;
  kibanaConfig: KibanaConfig;
  logger: Logger;
}) {
  const responses = await Promise.allSettled(
    kibanaConfig.hosts.map(async (host) => {
      logger.debug(`Fetching response from ${host}${KIBANA_ROOT_ROUTE}`);
      return fetch(`${host}${KIBANA_ROOT_ROUTE}`);
    })
  );

  responses.forEach((response, index) => {
    const host = `${kibanaConfig.hosts[index]}${KIBANA_ROOT_ROUTE}`;

    if (response.status !== 'rejected') {
      logger.debug(`Got response from ${host}: ${JSON.stringify(response.value.status)}`);

      return;
    }

    if (response.reason instanceof Error) {
      logger.error(response.reason);
    }

    if (response.reason instanceof Error && response.reason.name === 'AbortError') {
      logger.error(`Request timeout for ${host}`);

      return;
    }

    logger.error(
      `No response from ${host}: ${
        response.reason instanceof Error ? response.reason.message : JSON.stringify(response.reason)
      }`
    );
  });

  return responses;
}

function mergeResponses(
  responses: Array<PromiseFulfilledResult<Response> | PromiseRejectedResult>
) {
  const hasUnhealthyResponse = responses.some(isUnhealthyResponse);

  return {
    body: {}, // The control plane health check ignores the body, so we do the same
    statusCode: hasUnhealthyResponse ? 503 : 200,
  };
}

function isUnhealthyResponse(response: PromiseFulfilledResult<Response> | PromiseRejectedResult) {
  return (
    response.status === 'rejected' || !(isSuccess(response.value) || isUnauthorized(response.value))
  );
}

function isUnauthorized({ status, headers }: Response): boolean {
  return status === 401 && headers.has('www-authenticate');
}

function isSuccess({ status }: Response): boolean {
  return (status >= 200 && status <= 299) || status === 302;
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
      redirect: 'manual',
    };

    try {
      return await nodeFetch(url, fetchOptions);
    } finally {
      clearTimeout(timeoutId);
    }
  };
}
