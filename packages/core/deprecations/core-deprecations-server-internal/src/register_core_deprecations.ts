/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IConfigService } from '@kbn/config';
import type { Logger } from '@kbn/logging';
import { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import { DeprecationsFactory } from './deprecations_factory';

interface RegisterConfigDeprecationsInfo {
  deprecationsFactory: DeprecationsFactory;
  configService: IConfigService;
}

export const registerConfigDeprecationsInfo = ({
  deprecationsFactory,
  configService,
}: RegisterConfigDeprecationsInfo) => {
  const handledDeprecatedConfigs = configService.getHandledDeprecatedConfigs();

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
};

export interface ApiDeprecationsServiceDeps {
  logger: Logger;
  deprecationsFactory: DeprecationsFactory;
  http: InternalHttpServiceSetup;
  coreUsageData: InternalCoreUsageDataSetup;
}

export const registerApiDeprecationsInfo = ({
  deprecationsFactory,
  http,
  coreUsageData,
}: ApiDeprecationsServiceDeps): void => {
  const deprecationsRegistery = deprecationsFactory.getRegistry('core.api_deprecations');

  deprecationsRegistery.registerDeprecations({
    getDeprecations: async () => {
      console.log('calling get!!');

      const usageClient = coreUsageData.getClient();
      const deprecatedRoutes = http.getDeprecatedRoutes();
      const deprecatedStats = await usageClient.getDeprecatedApisStats();

      console.log('deprecatedRoutes::', deprecatedRoutes);
      console.log('deprecatedStats::', deprecatedStats);

      // Do the matching here
      // Do the diff here
      // write the messages here

      return [
        {
          routePath: '/api/chocolate_love',
          routeMethod: 'GET',
          title: `The Route "[GET] /api/chocolate_love" has deprected params`,
          level: 'warning',
          message: `Deprecated route [GET] /api/chocolate_love was called 34 times with deprecated params.\n
          The last time the deprecation was triggered was on Fri Sep 20 2024 14:28:22.\n
          This deprecation was previously marked as resolved but was called 3 times since it was marked on Fri Sep 13 2024 10:28:22.`,
          documentationUrl: 'https://google.com',
          correctiveActions: {
            manualSteps: [
              'The following query params are deprecated: dont_use,my_old_query_param',
              'Make sure you are not using any of these parameters when calling the API',
            ],
            api: {
              path: 'some-path',
              method: 'POST',
              body: {
                extra_param: 123,
              },
            },
          },
          deprecationType: 'api',
          requireRestart: false,
          domainId: 'core.router',
        },
      ];
    },
  });
};
