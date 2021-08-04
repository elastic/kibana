/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DeprecationsFactory } from './deprecations_factory';
import { DomainDeprecationDetails, RegisterDeprecationsConfig } from './types';
import { registerRoutes } from './routes';

import { CoreContext } from '../core_context';
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
 *
 * async function getDeprecations({ esClient, savedObjectsClient }: GetDeprecationsContext): Promise<DeprecationsDetails[]> {
 *   const deprecations: DeprecationsDetails[] = [];
 *   const count = await getTimelionSheetsCount(savedObjectsClient);
 *
 *   if (count > 0) {
 *     // Example of a manual correctiveAction
 *     deprecations.push({
 *       message: `You have ${count} Timelion worksheets. The Timelion app will be removed in 8.0. To continue using your Timelion worksheets, migrate them to a dashboard.`,
 *       documentationUrl:
 *         'https://www.elastic.co/guide/en/kibana/current/create-panels-with-timelion.html',
 *       level: 'warning',
 *       correctiveActions: {
 *         manualSteps: [
 *           'Navigate to the Kibana Dashboard and click "Create dashboard".',
 *           'Select Timelion from the "New Visualization" window.',
 *           'Open a new tab, open the Timelion app, select the chart you want to copy, then copy the chart expression.',
 *           'Go to Timelion, paste the chart expression in the Timelion expression field, then click Update.',
 *           'In the toolbar, click Save.',
 *           'On the Save visualization window, enter the visualization Title, then click Save and return.',
 *         ],
 *       },
 *     });
 *   }
 *
 *   // Example of an api correctiveAction
 *   deprecations.push({
 *     "message": "User 'test_dashboard_user' is using a deprecated role: 'kibana_user'",
 *     "documentationUrl": "https://www.elastic.co/guide/en/elasticsearch/reference/current/security-api-put-user.html",
 *     "level": "critical",
 *     "correctiveActions": {
 *         "api": {
 *             "path": "/internal/security/users/test_dashboard_user",
 *             "method": "POST",
 *             "body": {
 *                 "username": "test_dashboard_user",
 *                 "roles": [
 *                     "machine_learning_user",
 *                     "enrich_user",
 *                     "kibana_admin"
 *                 ],
 *                 "full_name": "Alison Goryachev",
 *                 "email": "alisongoryachev@gmail.com",
 *                 "metadata": {},
 *                 "enabled": true
 *             }
 *         },
 *         "manualSteps": [
 *             "Using Kibana user management, change all users using the kibana_user role to the kibana_admin role.",
 *             "Using Kibana role-mapping management, change all role-mappings which assing the kibana_user role to the kibana_admin role."
 *         ]
 *     },
 *   });
 *
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
  implements CoreService<InternalDeprecationsServiceSetup, InternalDeprecationsServiceStart> {
  private readonly logger: Logger;
  private readonly deprecationsFactory: DeprecationsFactory;

  constructor(private readonly coreContext: Pick<CoreContext, 'logger' | 'configService'>) {
    this.logger = coreContext.logger.get('deprecations-service');
    this.deprecationsFactory = new DeprecationsFactory({
      logger: this.logger,
    });
  }

  public setup({ http }: DeprecationsSetupDeps): InternalDeprecationsServiceSetup {
    this.logger.debug('Setting up Deprecations service');
    const deprecationsFactory = this.deprecationsFactory;

    registerRoutes({ http });
    this.registerConfigDeprecationsInfo(this.deprecationsFactory);

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
        getAllDeprecations: this.deprecationsFactory.getAllDeprecations.bind(null, {
          savedObjectsClient,
          esClient,
        }),
      };
    };
  }

  private registerConfigDeprecationsInfo(deprecationsFactory: DeprecationsFactory) {
    const handledDeprecatedConfigs = this.coreContext.configService.getHandledDeprecatedConfigs();

    for (const [domainId, deprecationsContexts] of handledDeprecatedConfigs) {
      const deprecationsRegistry = deprecationsFactory.getRegistry(domainId);
      deprecationsRegistry.registerDeprecations({
        getDeprecations: () => {
          return deprecationsContexts.map(({ message, correctiveActions, documentationUrl }) => {
            return {
              level: 'critical',
              deprecationType: 'config',
              message,
              correctiveActions,
              documentationUrl,
              requireRestart: true,
            };
          });
        },
      });
    }
  }
}
