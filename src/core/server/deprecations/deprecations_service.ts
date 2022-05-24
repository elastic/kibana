/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom } from 'rxjs';

import { DeprecationsFactory } from './deprecations_factory';
import { DomainDeprecationDetails, RegisterDeprecationsConfig } from './types';
import { registerRoutes } from './routes';
import { config as deprecationConfig, DeprecationConfigType } from './deprecation_config';
import { CoreContext } from '../core_context';
import { IConfigService } from '../config';
import { CoreService } from '../../types';
import { InternalHttpServiceSetup } from '../http';
import { Logger } from '../logging';
import { IScopedClusterClient } from '../elasticsearch/client';
import { SavedObjectsClientContract } from '../saved_objects/types';

/**
 * The deprecations service provides a way for the Kibana platform to communicate deprecated
 * features and configs with its users. These deprecations are only communicated
 * if the deployment is using these features. Allowing for a user tailored experience
 * for upgrading the stack version.
 *
 * The Deprecation service is consumed by the upgrade assistant to assist with the upgrade
 * experience.
 *
 * If a deprecated feature can be resolved without manual user intervention.
 * Using correctiveActions.api allows the Upgrade Assistant to use this api to correct the
 * deprecation upon a user trigger.
 *
 * @example
 * ```ts
 * import { DeprecationsDetails, GetDeprecationsContext, CoreSetup } from 'src/core/server';
 * import { i18n } from '@kbn/i18n';
 *
 * async function getDeprecations({ esClient, savedObjectsClient }: GetDeprecationsContext): Promise<DeprecationsDetails[]> {
 *   const deprecations: DeprecationsDetails[] = [];
 *   const count = await getFooCount(savedObjectsClient);
 *   if (count > 0) {
 *     deprecations.push({
 *       title: i18n.translate('xpack.foo.deprecations.title', {
 *         defaultMessage: `Foo's are deprecated`
 *       }),
 *       message: i18n.translate('xpack.foo.deprecations.message', {
 *         defaultMessage: `You have {count} Foo's. Migrate your Foo's to a dashboard to continue using them.`,
 *         values: { count },
 *       }),
 *       documentationUrl:
 *         'https://www.elastic.co/guide/en/kibana/current/foo.html',
 *       level: 'warning',
 *       correctiveActions: {
 *         manualSteps: [
 *            i18n.translate('xpack.foo.deprecations.manualStepOneMessage', {
 *              defaultMessage: 'Navigate to the Kibana Dashboard and click "Create dashboard".',
 *            }),
 *            i18n.translate('xpack.foo.deprecations.manualStepTwoMessage', {
 *              defaultMessage: 'Select Foo from the "New Visualization" window.',
 *            }),
 *         ],
 *         api: {
 *           path: '/internal/security/users/test_dashboard_user',
 *           method: 'POST',
 *           body: {
 *             username: 'test_dashboard_user',
 *             roles: [
 *               "machine_learning_user",
 *               "enrich_user",
 *               "kibana_admin"
 *             ],
 *             full_name: "Alison Goryachev",
 *             email: "alisongoryachev@gmail.com",
 *             metadata: {},
 *             enabled: true
 *           }
 *         },
 *       },
 *     });
 *   }
 *   return deprecations;
 * }
 *
 *
 * export class Plugin() {
 *   setup: (core: CoreSetup) => {
 *     core.deprecations.registerDeprecations({ getDeprecations });
 *   }
 * }
 * ```
 *
 * @public
 */
export interface DeprecationsServiceSetup {
  registerDeprecations: (deprecationContext: RegisterDeprecationsConfig) => void;
}

/**
 * Server-side client that provides access to fetch all Kibana deprecations
 *
 * @public
 */
export interface DeprecationsClient {
  getAllDeprecations: () => Promise<DomainDeprecationDetails[]>;
}

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
export interface InternalDeprecationsServiceSetup {
  getRegistry: (domainId: string) => DeprecationsServiceSetup;
}

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
