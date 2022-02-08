/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import type { DataRequestHandlerContext } from '../../../data/server';
import type { IRouter } from '../../../../core/server';
import { getRemoteRoutePaths } from '../../common';
import { FlameGraph } from './flamegraph';

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
        const esClient = context.core.elasticsearch.client.asCurrentUser;

        const resEvents = await esClient.search({
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
                      field: 'StackTraceID',
                      size: 20000,
                    },
                  },
                },
              },
            },
          },
        });

        const resTotalEvents = await esClient.search({
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
        });

        const tracesDocIDs: string[] = [];
        resEvents.body.aggregations.sample.group_by.buckets.forEach((stackTraceItem: any) => {
          tracesDocIDs.push(stackTraceItem.key);
        });

        const resStackTraces = await esClient.mget<any>({
          index: 'profiling-stacktraces',
          body: { ids: tracesDocIDs },
        });

        // sometimes we don't find the trace - needs investigation as we should always find
        // profiling-events to profiling-stack-traces
        const stackFrameDocIDs = new Set<string>();
        for (const trace of resStackTraces.body.docs) {
          if (trace.found) {
            for (const frameID of trace._source.FrameID) {
              stackFrameDocIDs.add(frameID);
            }
          }
        }

        const resStackFrames = await esClient.mget<any>({
          index: 'profiling-stackframes',
          body: { ids: [...stackFrameDocIDs] },
        });

        const flamegraph = new FlameGraph(
          resEvents.body,
          resTotalEvents.body,
          resStackTraces.body.docs,
          resStackFrames.body.docs
        );

        return response.ok({
          body: flamegraph.toElastic(),
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
