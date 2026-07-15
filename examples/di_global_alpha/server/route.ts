/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inject, injectService, injectable } from '@kbn/core-di';
import { Response } from '@kbn/core-di-server';
import type { KibanaResponseFactory } from '@kbn/core-http-server';
import { AlphaServiceToken, type IAlphaService } from '@kbn/di-global-alpha-types';
import { BetaServiceToken, type IBetaService } from '@kbn/di-global-beta-types';

/**
 * Demonstrates cross-plugin service resolution via service tokens.
 *
 * This route lives in the Alpha plugin but injects `BetaServiceToken`
 * which is published globally by the Beta plugin.  Neither plugin
 * declares the other in `requiredPlugins`.
 */
@injectable()
export class AlphaRoute {
  static method = 'get' as const;
  static path = '/api/di/global/alpha';
  static validate = {};
  static options = {
    xsrfRequired: false,
    access: 'public' as const,
  };
  static security = {
    authz: {
      enabled: false,
      reason: 'This route is opted out of authorization as it is a developer example endpoint.',
    },
  } as const;

  constructor(
    @injectService(AlphaServiceToken) private readonly alpha: IAlphaService,
    @injectService(BetaServiceToken) private readonly beta: IBetaService,
    @inject(Response) private readonly response: KibanaResponseFactory
  ) {}

  /**
   * Returns greetings from both the Alpha and Beta services to confirm that
   * cross-plugin token resolution is working in both directions.
   */
  public handle() {
    return this.response.ok({
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        alpha: this.alpha.greet(),
        beta: this.beta.greet(),
        source: 'alpha-plugin',
      }),
    });
  }
}
