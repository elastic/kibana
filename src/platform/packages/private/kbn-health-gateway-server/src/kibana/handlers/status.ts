/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { capitalize, chain, memoize } from 'lodash';
import { Agent, AgentOptions } from 'https';
import { URL } from 'url';
import type { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi';
import nodeFetch, { Response } from 'node-fetch';
import type { Logger } from '@kbn/logging';
import type { KibanaConfig } from '../kibana_config';

type Status = 'healthy' | 'unhealthy' | 'failure' | 'timeout';

const statusApiPath = '/api/status';

interface StatusRouteResponse {
  status: Status;
  hosts?: HostStatus[];
}

interface HostStatus {
  host: string;
  status: Status;
  code?: number;
}

export class StatusHandler {
  private static isHealthy(response: Response) {
    return StatusHandler.isSuccess(response) || StatusHandler.isUnauthorized(response);
  }

  private static isUnauthorized({ status, headers }: Response): boolean {
    return status === 401 && headers.has('www-authenticate');
  }

  private static isSuccess({ status }: Response): boolean {
    return (status >= 200 && status <= 299) || status === 302;
  }

  private static readonly STATUS_CODE: Record<Status, number> = {
    healthy: 200,
    unhealthy: 503,
    failure: 502,
    timeout: 504,
  };

  constructor(private kibanaConfig: KibanaConfig, private logger: Logger) {
    this.handler = this.handler.bind(this);
  }

  async handler(request: Request, toolkit: ResponseToolkit): Promise<ResponseObject> {
    const body = await this.poll();
    const code = StatusHandler.STATUS_CODE[body.status];

    this.logger.debug(() => `Returning ${code} response with body: ${JSON.stringify(body)}`);

    return toolkit.response(body).type('application/json').code(code);
  }

  private async poll(): Promise<StatusRouteResponse> {
    const hosts = await Promise.all(this.kibanaConfig.hosts.map(this.pollHost.bind(this)));
    const statuses = chain(hosts).map('status').uniq().value();
    const status = statuses.length <= 1 ? statuses[0] ?? 'healthy' : 'unhealthy';

    return {
      status,
      hosts,
    };
  }

  private async pollHost(host: string): Promise<HostStatus> {
    this.logger.debug(`Requesting '${host}'`);

    try {
      const response = await this.fetch(host);
      const status = StatusHandler.isHealthy(response) ? 'healthy' : 'unhealthy';
      this.logger.debug(
        `${capitalize(status)} response from '${host}' with code ${response.status}`
      );

      return {
        host,
        status,
        code: response.status,
      };
    } catch (error) {
      this.logger.error(error);

      if (error.name === 'AbortError') {
        this.logger.error(`Request timeout for '${host}'`);

        return {
          host,
          status: 'timeout',
        };
      }

      this.logger.error(`Failed response from '${host}': ${error.message}`);

      return {
        host,
        status: 'failure',
      };
    }
  }

  private async fetch(host: string) {
    const url = new URL(host);
    appendStatusApiPath(url);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.kibanaConfig.requestTimeout.asMilliseconds()
    );

    try {
      return await nodeFetch(url, {
        agent: url.protocol === 'https:' ? this.getAgent() : undefined,
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

const appendStatusApiPath = (url: URL) => {
  url.pathname = `${url.pathname}/${statusApiPath}`.replace(/\/{2,}/g, '/');
};
