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
  CoreSecurityDelegateHandle,
  FakeRequestEnricher,
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
import { WorkloadTypeRegistry } from './workload_type_registry';
import { createBoundWorkloadResolver } from './resolve_bound_workloads';

export class SecurityService
  implements CoreService<InternalSecurityServiceSetup, InternalSecurityServiceStart>
{
  private readonly log: Logger;
  private securityApi?: CoreSecurityDelegateContract;
  private fakeRequestEnricherAcquired = false;
  private readonly workloadTypes = new WorkloadTypeRegistry();
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
    const serverConfig: PKCS12ConfigType & { basePath?: string } = config.get(['server']);

    checkFipsConfig(securityConfig, elasticsearchConfig, serverConfig, this.log);

    // The HTTP service sets up after this one, so the base path comes from the same raw setting the
    // HTTP service reads, which its config schema has already validated.
    const serverBasePath = serverConfig?.basePath ?? '';

    return {
      registerSecurityDelegate: (api): CoreSecurityDelegateHandle => {
        if (this.securityApi) {
          throw new Error('security API can only be registered once');
        }
        this.securityApi = api;

        return {
          serviceAccounts: {
            getWorkloadTypeName: (pluginId, workloadType) =>
              this.workloadTypes.get(pluginId, workloadType)?.name,
            resolveBoundWorkloads: createBoundWorkloadResolver({
              registry: this.workloadTypes,
              serverBasePath,
              logger: this.log.get('service-accounts'),
            }),
          },
        };
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
        registerWorkloadType: (pluginId, registration) =>
          this.workloadTypes.register(pluginId, registration),
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
    return convertSecurityApi(apiContract, this.workloadTypes);
  }

  public stop() {
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
      this.configSubscription = undefined;
    }
  }
}
