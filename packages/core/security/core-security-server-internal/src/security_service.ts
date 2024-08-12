/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { CoreSecurityDelegateContract } from '@kbn/core-security-server';
import { Observable, Subscription } from 'rxjs';
import { Config } from '@kbn/config';
import { isFipsEnabled, checkFipsConfig } from './fips/fips';
import type {
  InternalSecurityServiceSetup,
  InternalSecurityServiceStart,
} from './internal_contracts';
import {
  getDefaultSecurityImplementation,
  convertSecurityApi,
  SecurityServiceConfigType,
} from './utils';

export class SecurityService
  implements CoreService<InternalSecurityServiceSetup, InternalSecurityServiceStart>
{
  private readonly log: Logger;
  private securityApi?: CoreSecurityDelegateContract;
  private config$: Observable<Config>;
  private configSubscription?: Subscription;
  private config: Config | undefined;
  private readonly getConfig = () => {
    if (!this.config) {
      throw new Error('Config is not available.');
    }
    return this.config;
  };

  constructor(coreContext: CoreContext) {
    this.log = coreContext.logger.get('security-service');

    this.config$ = coreContext.configService.getConfig$();
    this.configSubscription = this.config$.subscribe((config) => {
      this.config = config;
    });
  }

  public setup(): InternalSecurityServiceSetup {
    const config = this.getConfig();
    const securityConfig: SecurityServiceConfigType = config.get(['xpack', 'security']);

    checkFipsConfig(securityConfig, this.log);

    return {
      registerSecurityDelegate: (api) => {
        if (this.securityApi) {
          throw new Error('security API can only be registered once');
        }
        this.securityApi = api;
      },
      fips: {
        isEnabled: () => isFipsEnabled(securityConfig),
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

  public stop() {
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
      this.configSubscription = undefined;
    }
  }
}
