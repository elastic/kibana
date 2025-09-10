/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject, injectable } from 'inversify';
import { schema, type TypeOf } from '@kbn/config-schema';
import { Response } from '@kbn/core-di-server';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { Echo } from './echo';

export type EchoRequest = KibanaRequest<never, never, TypeOf<typeof EchoRoute.validate.body>>;

@injectable()
export class EchoRoute {
  static method = 'post' as const;
  static path = '/api/di/echo';
  static validate = {
    body: schema.string(),
  };
  static options = {
    xsrfRequired: false,
  };
  static security = {
    authz: {
      enabled: false,
      reason: 'This route is opted out of authorization as it is a developer example endpoint.',
    },
  } as const;

  constructor(
    @inject(Echo) private readonly service: Echo,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {}

  handle() {
    return this.response.ok({
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(this.service.echo()),
    });
  }
}
