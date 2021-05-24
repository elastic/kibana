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
import type { IFieldType } from '../index';
import { findIndexPatternById, getFieldByName } from '../index_patterns';
import { getRequestAbortedSignal } from '../lib';
import { getKbnServerError } from '../../../kibana_utils/server';
import { shimAbortSignal } from '../index';
import { ConfigSchema } from '../../config';

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
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (context, request, response) => {
      const config = await config$.pipe(first()).toPromise();
      const { tiers } = config.autocomplete.valueSuggestions;
      const { field: fieldName, query, filters, fieldMeta } = request.body;
      const { index } = request.params;
      const signal = getRequestAbortedSignal(request.events.aborted$);

      let field: IFieldType | undefined = fieldMeta;

      if (!field?.name && !field?.type) {
        const indexPattern = await findIndexPatternById(context.core.savedObjects.client, index);

        field = indexPattern && getFieldByName(fieldName, indexPattern);
      }

      try {
        const promise = context.core.elasticsearch.client.asCurrentUser.transport.request({
          method: 'POST',
          path: encodeURI(`/${index}/_terms_enum`),
          body: {
            field: field?.name ?? field,
            string: query,
            index_filter: {
              bool: {
                must: [
                  ...filters,
                  {
                    terms: {
                      _tier: tiers,
                    },
                  },
                ],
              },
            },
          },
        });

        const result = await shimAbortSignal(promise, signal);

        return response.ok({ body: result.body.terms });
      } catch (e) {
        throw getKbnServerError(e);
      }
    }
  );
}
