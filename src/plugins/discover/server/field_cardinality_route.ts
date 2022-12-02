/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { get } from 'lodash';
import { Observable } from 'rxjs';

import { schema } from '@kbn/config-schema';
import { SearchRequest } from '@kbn/data-plugin/common';
import { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import { getKbnServerError, reportServerError } from '@kbn/kibana-utils-plugin/server';

import { FieldCardinalityRequest, FieldCardinalityResponse } from '../common/terms_explorer/types';

export const setupFieldCardinalityRoute = ({ http }: CoreSetup) => {
  const router = http.createRouter();

  router.post(
    {
      path: '/api/kibana/discover/fieldCardinality/{index}',
      validate: {
        params: schema.object(
          {
            index: schema.string(),
          },
          { unknowns: 'allow' }
        ),
        body: schema.object(
          {
            filters: schema.maybe(schema.any()),
            fieldNames: schema.arrayOf(schema.string()),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (context, request, response) => {
      try {
        const termsExplorerRequest: FieldCardinalityRequest = request.body;
        const { index } = request.params;
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const termsExplorerResponse = await getFieldCardinalityResult({
          abortedEvent$: request.events.aborted$,
          request: termsExplorerRequest,
          esClient,
          index,
        });
        return response.ok({ body: termsExplorerResponse });
      } catch (e) {
        const kbnErr = getKbnServerError(e);
        return reportServerError(response, kbnErr);
      }
    }
  );

  const getFieldCardinalityResult = async ({
    abortedEvent$,
    esClient,
    request,
    index,
  }: {
    request: FieldCardinalityRequest;
    abortedEvent$: Observable<void>;
    esClient: ElasticsearchClient;
    index: string;
  }): Promise<FieldCardinalityResponse> => {
    const abortController = new AbortController();
    abortedEvent$.subscribe(() => abortController.abort());
    const { filters, fieldNames, from } = request;

    const aggs = fieldNames.reduce((a, fieldName) => {
      return {
        ...a,
        [fieldName]: {
          cardinality: {
            field: fieldName,
          },
        },
      };
    }, {});

    /**
     * Get row values
     */
    const body: SearchRequest['body'] = {
      size: 0,
      from,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: { ...aggs },
    };

    const rawEsResult = await esClient.search({ index, body }, { signal: abortController.signal });

    let minCardinality = { field: '', cardinality: Number.MAX_SAFE_INTEGER };
    fieldNames.forEach((fieldName) => {
      const cardinality = get(rawEsResult, `aggregations.${fieldName}.value`);
      if (cardinality < minCardinality.cardinality) {
        minCardinality = { field: fieldName, cardinality };
      }
    });

    return minCardinality;
  };
};
