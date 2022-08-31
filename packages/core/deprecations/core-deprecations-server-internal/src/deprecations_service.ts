/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { DeprecationsFactory } from './deprecations_factory';
import { registerRoutes } from './routes';
import { config as deprecationConfig, DeprecationConfigType } from './deprecation_config';

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

  public async setup({ http }: DeprecationsSetupDeps): Promise<InternalDeprecationsServiceSetup> {
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

    registerRoutes({ http });
    this.registerConfigDeprecationsInfo(this.deprecationsFactory);

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

  private registerConfigDeprecationsInfo(deprecationsFactory: DeprecationsFactory) {
    const handledDeprecatedConfigs = this.configService.getHandledDeprecatedConfigs();

    for (const [domainId, deprecationsContexts] of handledDeprecatedConfigs) {
      const deprecationsRegistry = deprecationsFactory.getRegistry(domainId);
      deprecationsRegistry.registerDeprecations({
        getDeprecations: () => {
          return deprecationsContexts.map(
            ({
              configPath,
              title = `${domainId} has a deprecated setting`,
              level,
              message,
              correctiveActions,
              documentationUrl,
            }) => ({
              configPath,
              title,
              level,
              message,
              correctiveActions,
              documentationUrl,
              deprecationType: 'config',
              requireRestart: true,
            })
          );
        },
      });
    }
  }
}
