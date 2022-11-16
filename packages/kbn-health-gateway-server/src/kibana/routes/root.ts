/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { memoize } from 'lodash';
import { Agent, AgentOptions } from 'https';
import { URL } from 'url';
import type { Request, ResponseObject, ResponseToolkit, ServerRoute } from '@hapi/hapi';
import nodeFetch, { Response } from 'node-fetch';
import type { IConfigService } from '@kbn/config';
import type { Logger } from '@kbn/logging';
import { KibanaConfig } from '../kibana_config';

const HTTPS = 'https:';
const KIBANA_ROOT_ROUTE = '/';

interface RootRouteDependencies {
  logger: Logger;
  config: IConfigService;
}

export class RootRoute implements ServerRoute {
  private static isUnhealthyResponse(response: PromiseSettledResult<Response>) {
    return (
      response.status === 'rejected' ||
      !(RootRoute.isSuccess(response.value) || RootRoute.isUnauthorized(response.value))
    );
  }

  private static isUnauthorized({ status, headers }: Response): boolean {
    return status === 401 && headers.has('www-authenticate');
  }

  private static isSuccess({ status }: Response): boolean {
    return (status >= 200 && status <= 299) || status === 302;
  }

  readonly method = 'GET';
  readonly path = '/';

  private kibanaConfig: KibanaConfig;
  private logger: Logger;

  constructor({ logger, config }: RootRouteDependencies) {
    this.kibanaConfig = new KibanaConfig({ config, logger });
    this.logger = logger;
    this.handler = this.handler.bind(this);

    return {
      method: this.method,
      path: this.path,
      handler: this.handler,
    } as RootRoute;
  }

  async handler(request: Request, toolkit: ResponseToolkit): Promise<ResponseObject> {
    const responses = await this.fetchHosts();
    const { body, statusCode } = this.mergeResponses(responses);
    this.logger.debug(`Returning ${statusCode} response with body: ${JSON.stringify(body)}`);

    return toolkit.response(body).type('application/json').code(statusCode);
  }

  private async fetchHosts() {
    const responses = await Promise.allSettled(
      this.kibanaConfig.hosts.map((host) => {
        this.logger.debug(`Fetching response from ${host}${KIBANA_ROOT_ROUTE}`);
        return this.fetch(`${host}${KIBANA_ROOT_ROUTE}`);
      })
    );

    responses.forEach((response, index) => {
      const host = `${this.kibanaConfig.hosts[index]}${KIBANA_ROOT_ROUTE}`;

      if (response.status !== 'rejected') {
        this.logger.debug(`Got response from ${host}: ${JSON.stringify(response.value.status)}`);

        return;
      }

      if (response.reason instanceof Error) {
        this.logger.error(response.reason);
      }

      if (response.reason instanceof Error && response.reason.name === 'AbortError') {
        this.logger.error(`Request timeout for ${host}`);

        return;
      }

      this.logger.error(
        `No response from ${host}: ${
          response.reason instanceof Error
            ? response.reason.message
            : JSON.stringify(response.reason)
        }`
      );
    });

    return responses;
  }

  private mergeResponses(responses: Array<PromiseSettledResult<Response>>) {
    const hasUnhealthyResponse = responses.some(RootRoute.isUnhealthyResponse);

    return {
      body: {}, // The control plane health check ignores the body, so we do the same
      statusCode: hasUnhealthyResponse ? 503 : 200,
    };
  }

  private async fetch(url: string) {
    const { protocol } = new URL(url);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.kibanaConfig.requestTimeout.asMilliseconds()
    );

    try {
      return await nodeFetch(url, {
        agent: protocol === HTTPS ? this.getAgent() : undefined,
        signal: controller.signal,
        redirect: 'manual',
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getAgent = memoize(() => new Agent(this.getAgentConfig()));

  private getAgentConfig() {
    const {
      certificateAuthorities: ca,
      certificate: cert,
      verificationMode,
    } = this.kibanaConfig.ssl;
    const options: AgentOptions = { ca, cert };

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
}
