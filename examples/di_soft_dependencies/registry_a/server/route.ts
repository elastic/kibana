/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject, injectable } from 'inversify';
import { Response } from '@kbn/core-di-server';
import type { KibanaResponseFactory } from '@kbn/core-http-server';
import { PLUGIN_ID, Registry } from '../common';

@injectable()
export class StatusRoute {
  static method = 'get' as const;
  static path = `/api/di_soft_deps/${PLUGIN_ID}`;
  static validate = false as const;
  static options = {
    access: 'internal',
  } as const;
  static security = {
    authz: {
      enabled: false,
      reason: 'This route is opted out of authorization as it is a developer example endpoint.',
    },
  } as const;

  constructor(
    @inject(Registry) private readonly registry: Registry,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {}

  handle() {
    return this.response.ok({ body: this.registry.getStatus() });
  }
}
