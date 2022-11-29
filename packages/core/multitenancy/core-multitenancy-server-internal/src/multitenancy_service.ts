/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom } from 'rxjs';
import type { IConfigService } from '@kbn/config';
import type { Logger } from '@kbn/logging';
import type { CoreContext } from '@kbn/core-base-server-internal';
import type { MultitenancyConfig } from '@kbn/core-multitenancy-server';
import { multitenancyConfig } from './multitenancy_config';
import type {
  InternalMultitenancyServiceStart,
  InternalMultitenancyServiceSetup,
} from './internal_contracts';

const configPath = multitenancyConfig.path;

/**
 * @internal
 */
export class MultitenancyService {
  private readonly configService: IConfigService;
  private readonly log: Logger;
  private config?: MultitenancyConfig;
  private contract?: InternalMultitenancyServiceSetup;

  constructor(core: CoreContext) {
    this.configService = core.configService;
    this.log = core.logger.get('multitenancy');
  }

  public async setup(): Promise<InternalMultitenancyServiceSetup> {
    this.config = await firstValueFrom(this.configService.atPath<MultitenancyConfig>(configPath));

    this.log.warn('**** multitenancy config: ' + JSON.stringify(this.config));

    this.contract = {
      getTenantIds: () => {
        return this.config!.tenants.map((tenant) => tenant.id);
      },
      getTenantConfig: (tenantId: string) => {
        const tenant = this.config!.tenants.find((t) => t.id === tenantId);
        if (!tenant) {
          throw new Error(`No tenant for id ${tenantId}`);
        }
        return tenant;
      },
    };
    return this.contract;
  }

  public async start(): Promise<InternalMultitenancyServiceStart> {
    if (!this.contract) {
      throw new Error('#setup() must be called first');
    }
    return this.contract!;
  }
}
