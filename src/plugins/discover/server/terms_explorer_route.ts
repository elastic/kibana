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

import {
  TermsExplorerNumericColumnResult,
  TermsExplorerRequest,
  TermsExplorerResponse,
  TermsExplorerResponseColumn,
} from '../common/terms_explorer/types';

export const setupTermsExplorerRoute = ({ http }: CoreSetup) => {
  const router = http.createRouter();

  router.post(
    {
      path: '/api/kibana/discover/termsExplorer/{index}',
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
            collapseFieldName: schema.string(),
            columns: schema.any(),
          },
          { unknowns: 'allow' }
        ),
      },
    },
    async (context, request, response) => {
      try {
        const termsExplorerRequest: TermsExplorerRequest = request.body;
        const { index } = request.params;
        const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const termsExplorerResponse = await getTermsExplorerResult({
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

  const getTermsExplorerResult = async ({
    abortedEvent$,
    esClient,
    request,
    index,
  }: {
    request: TermsExplorerRequest;
    abortedEvent$: Observable<void>;
    esClient: ElasticsearchClient;
    index: string;
  }): Promise<TermsExplorerResponse> => {
    const abortController = new AbortController();
    abortedEvent$.subscribe(() => abortController.abort());
    const { filters, collapseFieldName, columns, from, size, sortDirection } = request;

    /**
     * Get row values
     */
    const collapseBody: SearchRequest['body'] = {
      size,
      from,
      query: {
        bool: {
          filter: filters,
        },
      },
      sort: [
        {
          [collapseFieldName]: {
            order: sortDirection,
          },
        },
      ],
      _source: { includes: [collapseFieldName] },
      collapse: {
        field: collapseFieldName,
      },
      aggs: {
        totalRows: {
          cardinality: {
            field: collapseFieldName,
          },
        },
      },
    };

    const rawCollapseResult = await esClient.search(
      { index, body: collapseBody },
      { signal: abortController.signal }
    );

    const rowValues = rawCollapseResult.hits.hits.map((hit) => {
      return (hit._source as { [key: string]: string })[collapseFieldName];
    });

    const totalRows = get(rawCollapseResult, 'aggregations.totalRows.value');

    /**
     * Get columns for each row
     */

    const { stringColumns, numericColumns } = columns
      ? Object.entries(columns).reduce(
          (acc, [fieldName, fieldSpec]) => {
            if (fieldSpec.aggregatable && fieldSpec.type === 'string') {
              acc.stringColumns.push(fieldName);
            }
            if (fieldSpec.aggregatable && fieldSpec.type === 'number') {
              acc.numericColumns.push(fieldName);
            }
            return acc;
          },
          { stringColumns: [], numericColumns: [] } as {
            stringColumns: string[];
            numericColumns: string[];
          }
        )
      : { stringColumns: [], numericColumns: [] };

    const columnsBody: SearchRequest['body'] = {
      size: 0,
      query: {
        bool: {
          filter: filters,
        },
      },
      aggs: {
        rowsAgg: {
          filters: {
            filters: {
              ...rowValues.reduce((acc, row) => {
                acc[row] = { match: { [collapseFieldName]: row } };
                return acc;
              }, {} as { [key: string]: { match: unknown } }),
            },
          },
          aggs: {
            // all numeric fields get an aggregation. Sum for now, but later each field could have a different agg type...
            ...numericColumns.reduce((acc, fieldName) => {
              acc[fieldName] = {
                sum: {
                  field: fieldName,
                },
              };
              return acc;
            }, {} as { [key: string]: unknown }),

            // all string fields get a cardinality aggregation to determine whether to show the actual value, or a number of unique values.
            ...stringColumns.reduce((acc, fieldName) => {
              acc[fieldName] = {
                cardinality: {
                  field: fieldName,
                },
              };
              return acc;
            }, {} as { [key: string]: unknown }),

            // Also get the top hit for all string columns. If the cardinality for any string column is exactly one, the actual value can be found here.
            string_top_hits: {
              top_hits: {
                size: 1,
                _source: {
                  includes: stringColumns,
                },
              },
            },
          },
        },

        // top level aggs for the summary row...
        // all numeric fields get a summary aggregation. Sum for now, but later each field could have a different agg type...
        ...numericColumns.reduce((acc, fieldName) => {
          acc[`summary_${fieldName}`] = {
            sum: {
              field: fieldName,
            },
          };
          return acc;
        }, {} as { [key: string]: unknown }),
      },
    };
    const columnsResult = await esClient.search(
      { index, body: columnsBody },
      { signal: abortController.signal }
    );

    const summaryRow = numericColumns.reduce((acc, fieldName) => {
      const result = get(columnsResult, `aggregations.summary_${fieldName}.value`);
      acc[fieldName] = { result_type: 'numeric_aggregation', result };
      return acc;
    }, {} as { [key: string]: TermsExplorerNumericColumnResult });

    const responseRows = Object.values(get(columnsResult, 'aggregations.rowsAgg.buckets')).map(
      (bucketValue, rowIndex) => {
        const currentColumnResults: { [key: string]: TermsExplorerResponseColumn } = {};
        currentColumnResults[collapseFieldName] = {
          result_type: 'string_value',
          result: rowValues[rowIndex],
        };
        for (const numericColumnName of numericColumns) {
          currentColumnResults[numericColumnName] = {
            result_type: 'numeric_aggregation',
            result: get(bucketValue, `${numericColumnName}.value`),
          };
        }
        for (const stringColumnName of stringColumns) {
          const cardinalityValue = get(bucketValue, `${stringColumnName}.value`);
          if (cardinalityValue === 1) {
            currentColumnResults[stringColumnName] = {
              result_type: 'string_value',
              result: get(bucketValue, `string_top_hits.hits.hits[0]._source.${stringColumnName}`),
            };
          }
          if (cardinalityValue > 1) {
            currentColumnResults[stringColumnName] = {
              result_type: 'string_cardinality',
              result: cardinalityValue,
            };
          }
        }
        return currentColumnResults;
      }
    );

    return { rows: responseRows, totalRows, summaryRow };
  };
};
