/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type {
  CoreSecurityDelegateContract,
  FakeRequestEnricher,
  ServiceAccountOperationHandle,
  ServiceAccountOperationRegistration,
  ServiceAccountsServiceContract,
} from '@kbn/core-security-server';
import {
  SERVICE_ACCOUNT_OPERATION_TYPE_MAX_LENGTH,
  SERVICE_ACCOUNT_OPERATION_TYPE_REGEX,
} from '@kbn/core-security-server';
import type { Observable, Subscription } from 'rxjs';
import type { Config } from '@kbn/config';
import { isFipsEnabled, checkFipsConfig } from './fips/fips';
import type {
  InternalSecurityServiceSetup,
  InternalSecurityServiceStart,
} from './internal_contracts';
import type { SecurityServiceConfigType, PKCS12ConfigType } from './utils';
import { getDefaultSecurityImplementation, convertSecurityApi } from './utils';
import { createCoreUiamService } from './uiam';

export class SecurityService
  implements CoreService<InternalSecurityServiceSetup, InternalSecurityServiceStart>
{
  private readonly log: Logger;
  private securityApi?: CoreSecurityDelegateContract;
  private fakeRequestEnricherAcquired = false;
  private readonly claimedServiceAccountOperations = new Set<string>();
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
    const securityConfig: SecurityServiceConfigType | undefined = config.get(['xpack', 'security']);
    const elasticsearchConfig: PKCS12ConfigType = config.get(['elasticsearch']);
    const serverConfig: PKCS12ConfigType = config.get(['server']);

    checkFipsConfig(securityConfig, elasticsearchConfig, serverConfig, this.log);

    return {
      registerSecurityDelegate: (api) => {
        if (this.securityApi) {
          throw new Error('security API can only be registered once');
        }
        this.securityApi = api;
      },
      acquireFakeRequestEnricher: (): FakeRequestEnricher => {
        if (this.fakeRequestEnricherAcquired) {
          throw new Error(
            'acquireFakeRequestEnricher() can only be called once and is reserved for Task Manager.'
          );
        }
        this.fakeRequestEnricherAcquired = true;

        // Returned eagerly at setup but invoked at task-run time, by which point
        // the security delegate has been registered.
        return (request, user) => {
          if (!this.securityApi) {
            throw new Error(
              'Cannot enrich a fake request before the security delegate has been registered.'
            );
          }
          this.securityApi.fakeRequestEnricher(request, user);
        };
      },
      fips: {
        isEnabled: () => isFipsEnabled(securityConfig),
      },
      serviceAccounts: {
        registerOperation: (registration) => this.registerServiceAccountOperation(registration),
      },
      uiam: securityConfig?.uiam?.enabled
        ? createCoreUiamService(securityConfig.uiam.sharedSecret)
        : null,
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

  private registerServiceAccountOperation({
    type,
  }: ServiceAccountOperationRegistration): ServiceAccountOperationHandle {
    if (type.length > SERVICE_ACCOUNT_OPERATION_TYPE_MAX_LENGTH) {
      throw new Error(
        `Service account operation type is too long: it must be at most ${SERVICE_ACCOUNT_OPERATION_TYPE_MAX_LENGTH} characters, but got ${type.length}.`
      );
    }

    if (!SERVICE_ACCOUNT_OPERATION_TYPE_REGEX.test(type)) {
      throw new Error(
        `Invalid service account operation type [${type}]: only lowercase letters, digits and underscores are allowed.`
      );
    }

    if (this.claimedServiceAccountOperations.has(type)) {
      throw new Error(`Service account operation type [${type}] has already been registered.`);
    }
    this.claimedServiceAccountOperations.add(type);

    // Returned eagerly at setup, but every method resolves the delegate at call time: a plugin's
    // setup can run before the security plugin has registered one.
    const delegate = (): ServiceAccountsServiceContract => {
      if (!this.securityApi) {
        throw new Error(
          `Cannot use service account operation [${type}] before the security delegate has been registered.`
        );
      }
      return this.securityApi.serviceAccounts;
    };

    return {
      attach: async (request, params) => delegate().attachWorkload(type, request, params),
      detach: async (request, params) => delegate().detachWorkload(type, request, params),
      getBinding: async (params) => delegate().getWorkloadBinding(type, params),
      withScopedRequest: async (params, fn) =>
        delegate().withScopedRequestForWorkload(type, params, fn),
    };
  }
}
