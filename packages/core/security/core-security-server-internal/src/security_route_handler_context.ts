/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type {
  SecurityRequestHandlerContext,
  AuthcRequestHandlerContext,
} from '@kbn/core-security-server';
import type { InternalSecurityServiceStart } from './internal_contracts';

export class CoreSecurityRouteHandlerContext implements SecurityRequestHandlerContext {
  #authc?: AuthcRequestHandlerContext;

  constructor(
    private readonly securityStart: InternalSecurityServiceStart,
    private readonly request: KibanaRequest
  ) {}

  public get authc() {
    if (this.#authc == null) {
      this.#authc = {
        getCurrentUser: () => this.securityStart.authc.getCurrentUser(this.request),
      };
    }
    return this.#authc;
  }
}
