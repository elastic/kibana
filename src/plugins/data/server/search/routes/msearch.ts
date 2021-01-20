/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';

import { IRouter } from 'src/core/server';
import { SearchRouteDependencies } from '../search_service';

import { getCallMsearch } from './call_msearch';
import { reportServerError } from '../../../../kibana_utils/server';

/**
 * The msearch route takes in an array of searches, each consisting of header
 * and body json, and reformts them into a single request for the _msearch API.
 *
 * The reason for taking requests in a different format is so that we can
 * inject values into each request without needing to manually parse each one.
 *
 * This route is internal and _should not be used_ in any new areas of code.
 * It only exists as a means of removing remaining dependencies on the
 * legacy ES client.
 *
 * @deprecated
 */
export function registerMsearchRoute(router: IRouter, deps: SearchRouteDependencies): void {
  router.post(
    {
      path: '/internal/_msearch',
      validate: {
        body: schema.object({
          searches: schema.arrayOf(
            schema.object({
              header: schema.object(
                {
                  index: schema.string(),
                  preference: schema.maybe(schema.oneOf([schema.number(), schema.string()])),
                },
                { unknowns: 'allow' }
              ),
              body: schema.object({}, { unknowns: 'allow' }),
            })
          ),
        }),
      },
    },
    async (context, request, res) => {
      const callMsearch = getCallMsearch({
        esClient: context.core.elasticsearch.client,
        globalConfig$: deps.globalConfig$,
        uiSettings: context.core.uiSettings.client,
      });

      try {
        const response = await callMsearch({ body: request.body });
        return res.ok(response);
      } catch (err) {
        return reportServerError(res, err);
      }
    }
  );
}
