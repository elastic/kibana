/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreService } from '../../types';
import { DeprecationsFactory } from './deprecations_factory';
import { DeprecationsRegistry } from './deprecations_registry';

import { CoreContext } from '../core_context';
import { CoreUsageDataSetup } from '../core_usage_data';
import { InternalElasticsearchServiceSetup } from '../elasticsearch';
import { InternalHttpServiceSetup } from '../http';
import { Logger } from '../logging';
import { registerRoutes } from './routes';

/**
 * The deprecations service provides a way for the Kibana platform to communicate deprecated
 * features and configs with its users. These deprecations are only communicated
 * if the deployment is using these features. Allowing for a user tailored experience
 * for upgrading the stack version.
 *
 * @example
 * ```ts
 * import { DeprecationsDetails, GetDeprecationsContext, CoreSetup } from 'src/core/server';
 *
 * const getDeprecations = async ({ esClient, savedObjectsClient }: GetDeprecationsContext): DeprecationsDetails[] => {
 *   return [
 *      {
 *        message: string;
 *        level: 'warning' | 'critical';
 *        documentationUrl?: string;
 *        correctiveActions: {
 *          api?: {
 *            path: string;
 *            method: 'POST' | 'PUT';
 *            body?: { [key: string]: any },
 *          },
 *          manualSteps?: string[];
 *        }
 *      }
 *   ]
 * }
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
  registerDeprecations: DeprecationsRegistry['registerDeprecations'];
}

/** @internal */
export interface InternalDeprecationsServiceSetup {
  createRegistry: (pluginId: string) => DeprecationsServiceSetup;
}

/** @internal */
export interface DeprecationsSetupDeps {
  http: InternalHttpServiceSetup;
  elasticsearch: InternalElasticsearchServiceSetup;
  coreUsageData: CoreUsageDataSetup;
}

/** @internal */
export class DeprecationsService implements CoreService<InternalDeprecationsServiceSetup> {
  private readonly logger: Logger;

  constructor(private readonly coreContext: CoreContext) {
    this.logger = coreContext.logger.get('deprecations');
  }

  public setup({ http }: DeprecationsSetupDeps): InternalDeprecationsServiceSetup {
    this.logger.debug('Setting up Deprecations service');
    const deprecationsFactory = new DeprecationsFactory({
      logger: this.logger,
    });

    registerRoutes({ http, deprecationsFactory });
    this.registerConfigDeprecationsInfo(deprecationsFactory);

    return {
      createRegistry: (pluginId: string): DeprecationsServiceSetup => {
        const registry = deprecationsFactory.createRegistry(pluginId);
        return {
          registerDeprecations: registry.registerDeprecations,
        };
      },
    };
  }

  public start() {}
  public stop() {}

  private registerConfigDeprecationsInfo(deprecationsFactory: DeprecationsFactory) {
    const handledDeprecatedConfigs = this.coreContext.configService.getHandledDeprecatedConfigs();

    for (const [pluginId, deprecationsContexts] of handledDeprecatedConfigs) {
      const deprecationsRegistry = deprecationsFactory.createRegistry(pluginId);
      deprecationsRegistry.registerDeprecations({
        getDeprecations: () => {
          return deprecationsContexts.map(({ message, correctiveActions, documentationUrl }) => {
            return {
              level: 'critical',
              message,
              correctiveActions: correctiveActions ?? {},
              documentationUrl,
            };
          });
        },
      });
    }
  }
}
