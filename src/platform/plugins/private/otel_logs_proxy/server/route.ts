/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { injectable, inject } from 'inversify';
import { Request, Response } from '@kbn/core-di-server';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { Queue } from './queue';

@injectable()
export class ProxyRoute {
  static method = 'post' as const;
  static path = '/v1/logs';

  static security = {
    authz: {
      enabled: false,
      reason: 'This route is opted out from authorization',
    },
  } as const;
  static options = {
    authRequired: false,
    access: 'public',
    xsrfRequired: false,
  } as const;
  static validate = false as const;

  constructor(
    @inject(Request)
    private readonly request: KibanaRequest<never, never, any>,
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(Queue) private readonly queue: Queue
  ) {}

  async handle() {
    try {
      return await this.queue.push(this.request, this.response);
    } catch (error) {
      return this.response.customError({
        statusCode: 502,
        body: error instanceof Error ? error.message : error,
      });
    }
  }
}
