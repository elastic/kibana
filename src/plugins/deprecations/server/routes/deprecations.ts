/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IRouter } from 'src/core/server';

export function registerDeprecationRoutes(router: IRouter, deprecations: any) {
  router.get(
    {
      path: '/api/deprecations',
      validate: false,
    },
    async (context, request, response) => {
      const deps = deprecations.getDeprecations();

      const esClient = context.core.elasticsearch.client;

      const allDeps = await Promise.all(
        Object.entries(deps).map(async ([key, value]) => {
          const pluginDeprecations = await value.getDeprecations(esClient);
          const pluginDeprecationsWithId = pluginDeprecations.map((deps) => ({
            ...deps,
            pluginId: key,
          }));
          return pluginDeprecationsWithId;
        })
      );

      return response.ok({
        body: {
          deprecations: allDeps.flat(),
        },
      });
    }
  );
}
