/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import type { DataRequestHandlerContext } from '../../../data/server';
import type { IRouter } from '../../../../core/server';
import { getLocalRoutePaths } from '../../common';
import { mapFlamechart } from './mappings';

export function registerFlameChartElasticRoute(router: IRouter<DataRequestHandlerContext>) {
  const paths = getLocalRoutePaths();
  router.get(
    {
      path: paths.FlamechartElastic,
      validate: {
        query: schema.object({
          index: schema.maybe(schema.string()),
          projectID: schema.maybe(schema.string()),
          timeFrom: schema.maybe(schema.string()),
          timeTo: schema.maybe(schema.string()),
        }),
      },
    },
   async (ctx, request, response) => {
      const timeFrom = parseInt(request.query.timeFrom);
      const timeTo = parseInt(request.query.timeTo);
      const seconds = timeTo - timeFrom;
      const src = await import(`../fixtures/flamechart_${seconds}`);
      delete src.default;
      return response.ok({ body: mapFlamechart(src) });
    }
  );
}
