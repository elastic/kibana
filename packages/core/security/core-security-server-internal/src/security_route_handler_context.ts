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
  AuditRequestHandlerContext,
} from '@kbn/core-security-server';
import type { InternalSecurityServiceStart } from './internal_contracts';

export class CoreSecurityRouteHandlerContext implements SecurityRequestHandlerContext {
  #authc?: AuthcRequestHandlerContext;
  #audit?: AuditRequestHandlerContext;
  constructor(
    private readonly securityStart: InternalSecurityServiceStart,
    private readonly request: KibanaRequest
  ) {}

  public get authc() {
    if (this.#authc == null) {
      this.#authc = {
        getCurrentUser: () => this.securityStart.authc.getCurrentUser(this.request),
        apiKeys: {
          areAPIKeysEnabled: this.securityStart.authc.apiKeys.areAPIKeysEnabled.bind(
            this.securityStart.authc.apiKeys
          ),
          create: this.securityStart.authc.apiKeys.create.bind(
            this.securityStart.authc.apiKeys,
            this.request
          ),
          update: this.securityStart.authc.apiKeys.update.bind(
            this.securityStart.authc.apiKeys,
            this.request
          ),
          validate: this.securityStart.authc.apiKeys.validate.bind(
            this.securityStart.authc.apiKeys
          ),
          invalidate: this.securityStart.authc.apiKeys.invalidate.bind(
            this.securityStart.authc.apiKeys,
            this.request
          ),
        },
      };
    }
    return this.#authc;
  }

  public get audit() {
    if (this.#audit == null) {
      this.#audit = {
        logger: this.securityStart.audit.asScoped(this.request),
      };
    }
    return this.#audit;
  }
}
