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
import { getRemoteRoutePaths } from '../../common';
import { getBase64Encoding } from './index';

export function registerFlameChartSearchRoute(router: IRouter<DataRequestHandlerContext>) {
  const paths = getRemoteRoutePaths();
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
    async (context, request, response) => {
      const { index, projectID, timeFrom, timeTo } = request.query;

      try {
        const resFlamegraphTraces = await context
          .search!.search(
            {
              params: {
                index,
                body: {
                  query: {
                    function_score: {
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
                      random_score: {},
                    },
                  },
                  aggs: {
                    sample: {
                      sampler: {
                        shard_size: 20000,
                      },
                      aggs: {
                        group_by: {
                          terms: {
                            field: 'TraceHash',
                            size: 20000,
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

        const resTotalTraces = await context
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
            } as IEsSearchRequest,
            {}
          )
          .toPromise();

        const tracesDocIDs: string[] = [];
        resFlamegraphTraces.rawResponse.aggregations.sample.group_by.buckets.forEach(
          (stackTraceItem: any) => {
            const docID = getBase64Encoding(stackTraceItem.key);
            tracesDocIDs.push(docID);
          }
        );

        const esClient = context.core.elasticsearch.client.asCurrentUser;

        const resStackTraces = await esClient.mget<any>({
          index: 'profiling-stacktraces',
          body: { ids: tracesDocIDs },
        });

        const stackFrameDocIDs: string[] = [];
        resStackTraces.body.docs.forEach((trace: any) => {
          // sometimes we don't find the trace - needs investigation as we should always find
          // profiling-events to profiling-stack-traces
          if (trace._source) {
            for (let i = 0; i < trace._source.Offset.length; i++) {
              const docID = getBase64Encoding(trace._source.FileIDHash[i]);
              stackFrameDocIDs.push(docID);
            }
          }
        });

        const resStackFrames = await esClient.mget<any>({
          index: 'profiling-stackframes',
          body: { ids: stackFrameDocIDs },
        });

        return response.ok({
          body: {
            flameChart: (resFlamegraphTraces as IEsSearchResponse).rawResponse,
            totalTraces: (resTotalTraces as IEsSearchResponse).rawResponse.aggregations,
            stackTraces: resStackTraces.body.docs,
            stackFrames: resStackFrames.body.docs,
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
