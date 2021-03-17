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
 * Deprecations Service is a mechanism to allow plugins to communiicate deprecated features.
 *
 * @example
 * ```ts
 * import { DeprecationsContext, CoreSetup } from 'src/core/server';
 *
 * const getDeprecations: DeprecationsContext['getDeprecations'] = async ({ esClient, savedObjectsClient }) => {
 *   return [
 *      {
 *        message: string;
 *        level: 'warning' | 'critical';
 *        documentationUrl?: string;
 *        correctionActions: {
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
          return deprecationsContexts.map(({ message, correctionActions, documentationUrl }) => {
            return {
              level: 'critical',
              message,
              correctionActions: correctionActions ?? {},
              documentationUrl,
            };
          });
        },
      });
    }
  }
}
