/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from 'src/core/server';
import { DeprecationDependencies, DeprecationInfo, DeprecationContext } from '../types';

export function registerDeprecationRoutes(router: IRouter, deprecations: any) {
  router.get(
    {
      path: '/api/deprecations',
      validate: false,
    },
    async (context, request, response) => {
      const deprecationInfo: DeprecationContext = deprecations.getDeprecationInfo();

      const dependencies: DeprecationDependencies = {
        esClient: context.core.elasticsearch.client,
        savedObjectsClient: context.core.savedObjects.client,
      };

      const pluginDeprecationsList = await Promise.all(
        Object.entries(deprecationInfo).map(async ([pluginId, deprecationInfoContext]) => {
          const pluginDeprecations: DeprecationInfo[] = await deprecationInfoContext.getDeprecations(
            dependencies
          );
          const pluginDeprecationsWithId = pluginDeprecations.map((pluginDeprecation) => ({
            ...pluginDeprecation,
            pluginId,
          }));
          return pluginDeprecationsWithId;
        })
      ).catch((error) => {
        // TODO handle error
        // eslint-disable-next-line no-console
        console.log('error', error);
      });

      const flattenedPluginDeprecationsList =
        pluginDeprecationsList && pluginDeprecationsList.length
          ? pluginDeprecationsList.flat()
          : [];

      return response.ok({
        body: {
          deprecations: flattenedPluginDeprecationsList,
        },
      });
    }
  );
}
