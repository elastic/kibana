/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject, injectable } from 'inversify';
import { request as transport } from 'https';
import { pick } from 'lodash';
import type {
  Logger,
  PluginInitializerContext,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
} from '@kbn/core/server';
import { Logger as LoggerService } from '@kbn/core-di';
import { PluginInitializer } from '@kbn/core-di-server';
import type { ConfigType } from '.';

type Resolve = (value: IKibanaResponse) => void;
type Reject = (reason?: any) => void;

interface Task {
  request: KibanaRequest;
  response: KibanaResponseFactory;
  resolve: Resolve;
  reject: Reject;
}

@injectable()
export class Queue {
  private queue: Task[] = [];
  private config: ConfigType;

  constructor(
    @inject(PluginInitializer('config')) config: PluginInitializerContext['config'],
    @inject(LoggerService) private readonly logger: Logger
  ) {
    this.config = config.get();
    this.logger.info(
      `Initialized queue with the following config: ${JSON.stringify(this.config, undefined, 2)}`
    );
  }

  push(request: KibanaRequest, response: KibanaResponseFactory) {
    this.logger.info(`Queueing request to '${request.url.pathname}${request.url.search}'`);
    return new Promise<IKibanaResponse>((resolve, reject) => {
      this.queue.push({ request, response, resolve, reject });
    });
  }

  flush() {
    if (!this.queue.length) {
      return;
    }

    this.logger.info(`Flushing ${this.queue.length} queued requests`);
    this.queue.splice(0, this.queue.length).forEach((task) => this.handle(task));
  }

  private handle({ request, response, resolve, reject }: Task) {
    const url = new URL(`${request.url.pathname}${request.url.search}`, this.config.url);
    const options = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: request.route.method,
      headers: {
        ...pick(request.headers, ['authorization', 'user-agent', 'content-type']),
        host: `${url.hostname}:${url.port}`,
      } as unknown as Record<string, string>,
      rejectsUnauthorized: false,
    };
    this.logger.info(`Processing ${JSON.stringify(options, undefined, 2)}`);
    try {
      const upstream = transport(options, (result) => {
        this.logger.info(
          `Received response with status code ${result.statusCode} for '${options.method} ${options.hostname}${options.path}{$options.search}'`
        );
        resolve(
          response.custom({
            statusCode: result.statusCode!,
            headers: result.headers as Record<string, string[]>,
            body: result,
          })
        );
      });

      upstream.on('error', (error) => {
        this.logger.error(error);
        reject(error);
      });
      upstream.write(JSON.stringify(request.body));
      upstream.end();
    } catch (error) {
      this.logger.error(error);
      reject(error);
    }
  }
}
