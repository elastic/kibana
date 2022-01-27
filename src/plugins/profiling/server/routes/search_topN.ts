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
import { getBase64Encoding } from './index';

export function queryTopNCommon(
  router: IRouter<DataRequestHandlerContext>,
  pathName: string,
  searchField: string
) {
  router.get(
    {
      path: pathName,
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
                            '@timestamp': {
                              gte: timeFrom,
                              lt: timeTo,
                              format: 'epoch_second',
                              boost: 1.0,
                            },
                          },
                        },
                      ],
                    },
                  },
                  aggs: {
                    histogram: {
                      auto_date_histogram: {
                        field: '@timestamp',
                        buckets: 100,
                      },
                      aggs: {
                        group_by: {
                          terms: {
                            field: searchField,
                            order: {
                              Count: 'desc',
                            },
                            size: 100,
                          },
                          aggs: {
                            Count: {
                              sum: {
                                field: 'Count',
                              },
                            },
                          },
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

        if (searchField === 'TraceHash') {
          const docIDs: string[] = [];
          resTopNStackTraces.rawResponse.aggregations.histogram.buckets.forEach((timeInterval) => {
            timeInterval.group_by.buckets.forEach((stackTraceItem: any) => {
              const docID = getBase64Encoding(stackTraceItem.key);

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
              topN: (resTopNStackTraces as IEsSearchResponse).rawResponse.aggregations,
              traceMetadata: resTraceMetadata.body.docs,
            },
          });
        } else {
          return response.ok({
            body: {
              topN: (resTopNStackTraces as IEsSearchResponse).rawResponse.aggregations,
            },
          });
        }
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
