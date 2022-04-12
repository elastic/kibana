/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'kibana/server';
import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { getRequestAbortedSignal } from '../lib';
import { getKbnServerError, reportServerError } from '../../../kibana_utils/server';
import type { ConfigSchema } from '../../config';
import { termsEnumSuggestions } from './terms_enum';
import { termsAggSuggestions } from './terms_agg';

export function registerValueSuggestionsRoute(router: IRouter, config$: Observable<ConfigSchema>) {
  router.post(
    {
      path: '/api/kibana/suggestions/values/{index}',
      validate: {
        params: schema.object(
          {
            index: schema.string(),
          },
          { unknowns: 'allow' }
        ),
        body: schema.object(
          {
            field: schema.string(),
            query: schema.string(),
            filters: schema.maybe(schema.any()),
            fieldMeta: schema.maybe(schema.any()),
            method: schema.maybe(
              schema.oneOf([schema.literal('terms_agg'), schema.literal('terms_enum')])
            ),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (context, request, response) => {
      const config = await config$.pipe(first()).toPromise();
      const { field: fieldName, query, filters, fieldMeta, method } = request.body;
      const { index } = request.params;
      const abortSignal = getRequestAbortedSignal(request.events.aborted$);
      const { savedObjects, elasticsearch } = await context.core;

      try {
        const fn = method === 'terms_agg' ? termsAggSuggestions : termsEnumSuggestions;
        const body = await fn(
          config,
          savedObjects.client,
          elasticsearch.client.asCurrentUser,
          index,
          fieldName,
          query,
          filters,
          fieldMeta,
          abortSignal
        );
        return response.ok({ body });
      } catch (e) {
        const kbnErr = getKbnServerError(e);
        return reportServerError(response, kbnErr);
      }
    }
  );
}
