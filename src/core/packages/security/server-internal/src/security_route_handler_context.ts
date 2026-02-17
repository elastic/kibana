/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
      const uiam = this.securityStart.authc.apiKeys.uiam;

      this.#authc = {
        getCurrentUser: () => this.securityStart.authc.getCurrentUser(this.request),
        apiKeys: {
          areAPIKeysEnabled: () => this.securityStart.authc.apiKeys.areAPIKeysEnabled(),
          create: (createParams) =>
            this.securityStart.authc.apiKeys.create(this.request, createParams),
          update: (updateParams) =>
            this.securityStart.authc.apiKeys.update(this.request, updateParams),
          validate: (apiKeyParams) => this.securityStart.authc.apiKeys.validate(apiKeyParams),
          invalidate: (apiKeyParams) =>
            this.securityStart.authc.apiKeys.invalidate(this.request, apiKeyParams),
          uiam: uiam
            ? {
                grant: (grantUiamApiKeyParams) => uiam.grant(this.request, grantUiamApiKeyParams),
                invalidate: (invalidateUiamApiKeyParams) =>
                  uiam.invalidate(this.request, invalidateUiamApiKeyParams),
              }
            : null,
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
