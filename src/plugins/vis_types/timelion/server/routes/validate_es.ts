/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';
import { IRouter } from 'kibana/server';
import type { DataRequestHandlerContext } from '../../../../data/server';

export function validateEsRoute(router: IRouter<DataRequestHandlerContext>) {
  router.get(
    {
      path: '/api/timelion/validate/es',
      validate: false,
    },
    async function (context, request, response) {
      const uiSettings = await context.core.uiSettings.client.getAll();

      const timefield = uiSettings['timelion:es.timefield'];

      const body = {
        params: {
          index: uiSettings['es.default_index'],
          body: {
            aggs: {
              maxAgg: {
                max: {
                  field: timefield,
                },
              },
              minAgg: {
                min: {
                  field: timefield,
                },
              },
            },
            size: 0,
          },
        },
      };

      let resp;
      try {
        resp = (await context.search!.search(body, {}).toPromise()).rawResponse;
      } catch (errResp) {
        resp = errResp;
      }

      if (_.has(resp, 'aggregations.maxAgg.value') && _.has(resp, 'aggregations.minAgg.value')) {
        return response.ok({
          body: {
            ok: true,
            field: timefield,
            min: _.get(resp, 'aggregations.minAgg.value'),
            max: _.get(resp, 'aggregations.maxAgg.value'),
          },
        });
      }

      return response.ok({
        body: {
          ok: false,
          resp,
        },
      });
    }
  );
}
