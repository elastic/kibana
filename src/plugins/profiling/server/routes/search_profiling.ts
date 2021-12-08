/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { IEsSearchRequest } from '../../../data/server';
import { IEsSearchResponse } from '../../../data/common';
import type { DataRequestHandlerContext } from '../../../data/server';
import type { IRouter } from '../../../../core/server';
import { TRACE_EVENTS_TOPN_SEARCH_ROUTE_PATH } from '../../common';
import { ElasticsearchClient } from '../../../../core/server';
import { ParsedTechnicalFields } from '../../common/types';

export function registerTraceEventsTopNSearchRoute(
  router: IRouter<DataRequestHandlerContext>,
  esClient: ElasticsearchClient
) {
  router.get(
    {
      path: TRACE_EVENTS_TOPN_SEARCH_ROUTE_PATH,
      validate: false,
    },
    async (context, request, response) => {
      const resTopNStackTraces = await context
        .search!.search(
          {
            params: {
              index: 'profiling-events',
              wait_for_completion_timeout: '5m',
              keep_alive: '5m',
              query: {
                bool: {
                  must: [
                    {
                      term: {
                        ProjectID: {
                          value: 1,
                          boost: 1.0,
                        },
                      },
                    },
                    {
                      range: {
                        TimeStamp: {
                          gte: '2021-12-01 13:05:04.000',
                          lt: '2021-12-03 13:13:44.000',
                          format: 'yyyy-MM-dd HH:mm:ss.SSS',
                          time_zone: 'Z',
                          boost: 1.0,
                        },
                      },
                    },
                  ],
                },
              },
              aggs: {
                histogram: {
                  date_histogram: {
                    field: 'TimeStamp',
                    fixed_interval: '100s',
                  },
                  aggs: {
                    group_by: {
                      multi_terms: {
                        terms: [
                          {
                            field: 'StackTraceIDA',
                          },
                          {
                            field: 'StackTraceIDB',
                          },
                        ],
                        size: 10,
                      },
                    },
                  },
                },
              },
            },
          } as IEsSearchRequest,
          {}
        )
        .toPromise();

      const docIDs: string[] = [];
      resTopNStackTraces.rawResponse.aggregations.histogram.buckets.forEach((timeInterval) => {
        timeInterval.group_by.buckets.forEach((stackTraceItem) => {
          const bigIntKey0 = BigInt(stackTraceItem.key[0]);
          const bigIntKey1 = BigInt(stackTraceItem.key[1]);
          const docID = getDocID(bigIntKey0, bigIntKey1);

          docIDs.push(docID);
        });
      });

      esClient = context.core.elasticsearch.client.asCurrentUser;

      const resTraceMetadata = await esClient.mget<ParsedTechnicalFields>({
        index: 'profiling-stacktraces',
        body: { ids: docIDs },
      });

      return response.ok({
        body: {
          topNStackTraces: (resTopNStackTraces as IEsSearchResponse).rawResponse.aggregations,
          traceMetadata: resTraceMetadata.body.docs,
        },
      });
    }
  );
}

function getDocID(hi: bigint, lo: bigint) {
  let hex = hi.toString(16);
  const hexLo = lo.toString(16);
  hex = '0'.repeat(16 - hex.length) + hex;
  hex = hex + '0'.repeat(16 - hexLo.length) + hexLo;

  const bin = [];
  let i = 0;
  let d;
  let b;
  while (i < hex.length) {
    d = parseInt(hex.slice(i, i + 2), 16);
    b = String.fromCharCode(d);
    bin.push(b);
    i += 2;
  }

  return btoa(bin.join('')).replace('+', '-').replace('/', '_');
}
