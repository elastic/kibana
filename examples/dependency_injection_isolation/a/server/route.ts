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
import { type IGlobalService, type INameService, GlobalServiceToken, NameServiceToken } from '@kbn/dependency-injection-c/server';

@injectable()
export class TestRoute {
  static method = 'get' as const;
  static path = '/api/di/a';
  static validate = {};
  static options = {
    access: 'public',
  } as const;
  static security = {
    authc: {
      enabled: false,
      reason: '',
    },
    authz: {
      enabled: false,
      reason: '',
    },
  } as const;

  constructor(
    @inject(Response) private readonly response: KibanaResponseFactory,
    @inject(GlobalServiceToken) private readonly globalService: IGlobalService,
    @inject(NameServiceToken) private readonly nameService: INameService
  ) {}

  handle() {
    return this.response.ok({
      headers: { 'content-type': 'application/json' },
      body: {
        context: this.globalService.getName(),
        message: this.nameService.getName(),
      },
    });
  }
}
