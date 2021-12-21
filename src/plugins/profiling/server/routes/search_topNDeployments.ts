/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import { IEsSearchRequest } from '../../../data/server';
import { IEsSearchResponse } from '../../../data/common';
import type { DataRequestHandlerContext } from '../../../data/server';
import type { IRouter } from '../../../../core/server';
import { TRACE_EVENTS_TOPN_DEPLOYMENTS_SEARCH_ROUTE_PATH } from '../../common';
import { getDocID } from './index';

export function registerTraceEventsTopNDeploymentsSearchRoute(router: IRouter<DataRequestHandlerContext>) {
  router.get(
    {
      path: TRACE_EVENTS_TOPN_DEPLOYMENTS_SEARCH_ROUTE_PATH,
      validate: {
        query: schema.object({
          index: schema.maybe(schema.string()),
          projectID: schema.maybe(schema.string()),
          timeFrom: schema.maybe(schema.string()),
          timeTo: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      const { index, projectID, timeFrom, timeTo } = request.query;

      try {
        const resTopNStackTraces = await context
          .search!.search(
            {
              params: {
                index,
                body: {
                  query: {
                    bool: {
                      must: [
                        {
                          term: {
                            ProjectID: {
                              value: projectID,
                              boost: 1.0,
                            },
                          },
                        },
                        {
                          range: {
                            TimeStamp: {
                              gte: timeFrom,
                              lt: timeTo,
                              format: 'strict_date_optional_time',
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
                          terms: {
                            field: 'PodName',
                          },
                          size: 10000,
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
        // @ts-ignore
        resTopNStackTraces.rawResponse.aggregations.histogram.buckets.forEach((timeInterval) => {
          timeInterval.group_by.buckets.forEach((stackTraceItem: any) => {
            const bigIntKey0 = BigInt(stackTraceItem.key[0]);
            const bigIntKey1 = BigInt(stackTraceItem.key[1]);
            const docID = getDocID(bigIntKey0, bigIntKey1);

            docIDs.push(docID);
          });
        });

        const esClient = context.core.elasticsearch.client.asCurrentUser;

        const resTraceMetadata = await esClient.mget<any>({
          index: 'profiling-stacktraces',
          body: { ids: docIDs },
        });

        return response.ok({
          body: {
            topNDeployments: (resTopNStackTraces as IEsSearchResponse).rawResponse.aggregations,
            traceMetadata: resTraceMetadata.body.docs,
          },
        });
      } catch (e) {
        return response.customError({
          statusCode: e.statusCode ?? 500,
          body: {
            message: e.message,
          },
        });
      }
    }
  );
}
