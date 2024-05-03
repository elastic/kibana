/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-browser-internal';
import type { CoreSecurityDelegateContract } from '@kbn/core-security-browser';
import type {
  InternalSecurityServiceSetup,
  InternalSecurityServiceStart,
} from './internal_contracts';
import { getDefaultSecurityImplementation, convertSecurityApi } from './utils';

export class SecurityService
  implements CoreService<InternalSecurityServiceSetup, InternalSecurityServiceStart>
{
  private readonly log: Logger;
  private securityApi?: CoreSecurityDelegateContract;

  constructor(coreContext: CoreContext) {
    this.log = coreContext.logger.get('security-service');
  }

  public setup(): InternalSecurityServiceSetup {
    return {
      registerSecurityDelegate: (api) => {
        if (this.securityApi) {
          throw new Error('security API can only be registered once');
        }
        this.securityApi = api;
      },
    };
  }

  public start(): InternalSecurityServiceStart {
    if (!this.securityApi) {
      this.log.warn('Security API was not registered, using default implementation');
    }
    const apiContract = this.securityApi ?? getDefaultSecurityImplementation();
    return convertSecurityApi(apiContract);
  }

  public stop() {}
}
