/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type { IConfigService } from '@kbn/config';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type {
  DeprecationsServiceSetup,
  DeprecationRegistryProvider,
  DeprecationsClient,
} from '@kbn/core-deprecations-server';
import { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import { DeprecationsFactory } from './deprecations_factory';
import { registerRoutes } from './routes';
import { config as deprecationConfig, DeprecationConfigType } from './deprecation_config';
import { registerApiDeprecationsInfo, registerConfigDeprecationsInfo } from './deprecations';

export interface InternalDeprecationsServiceStart {
  /**
   * Creates a {@link DeprecationsClient} with provided SO client and ES client.
   *
   */
  asScopedToClient(
    esClient: IScopedClusterClient,
    savedObjectsClient: SavedObjectsClientContract
  ): DeprecationsClient;
}

/** @internal */
export type InternalDeprecationsServiceSetup = DeprecationRegistryProvider;

/** @internal */
export interface DeprecationsSetupDeps {
  http: InternalHttpServiceSetup;
  coreUsageData: InternalCoreUsageDataSetup;
}

/** @internal */
export class DeprecationsService
  implements CoreService<InternalDeprecationsServiceSetup, InternalDeprecationsServiceStart>
{
  private readonly logger: Logger;
  private readonly configService: IConfigService;
  private deprecationsFactory?: DeprecationsFactory;

  constructor(coreContext: Pick<CoreContext, 'logger' | 'configService'>) {
    this.logger = coreContext.logger.get('deprecations-service');
    this.configService = coreContext.configService;
  }

  public async setup({
    http,
    coreUsageData,
  }: DeprecationsSetupDeps): Promise<InternalDeprecationsServiceSetup> {
    this.logger.debug('Setting up Deprecations service');

    const config = await firstValueFrom(
      this.configService.atPath<DeprecationConfigType>(deprecationConfig.path)
    );

    this.deprecationsFactory = new DeprecationsFactory({
      logger: this.logger,
      config: {
        ignoredConfigDeprecations: config.skip_deprecated_settings,
      },
    });

    registerRoutes({ http, coreUsageData });

    registerConfigDeprecationsInfo({
      deprecationsFactory: this.deprecationsFactory,
      configService: this.configService,
    });

    registerApiDeprecationsInfo({
      deprecationsFactory: this.deprecationsFactory,
      http,
      coreUsageData,
    });

    const deprecationsFactory = this.deprecationsFactory;
    return {
      getRegistry: (domainId: string): DeprecationsServiceSetup => {
        const registry = deprecationsFactory.getRegistry(domainId);
        return {
          registerDeprecations: registry.registerDeprecations,
        };
      },
    };
  }

  public start(): InternalDeprecationsServiceStart {
    if (!this.deprecationsFactory) {
      throw new Error('`setup` must be called before `start`');
    }

    return {
      asScopedToClient: this.createScopedDeprecations(),
    };
  }

  public stop() {}

  private createScopedDeprecations(): (
    esClient: IScopedClusterClient,
    savedObjectsClient: SavedObjectsClientContract
  ) => DeprecationsClient {
    return (esClient: IScopedClusterClient, savedObjectsClient: SavedObjectsClientContract) => {
      return {
        getAllDeprecations: this.deprecationsFactory!.getAllDeprecations.bind(null, {
          savedObjectsClient,
          esClient,
        }),
      };
    };
  }
}
