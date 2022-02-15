/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import type { IRouter } from 'kibana/server';
import type { DataRequestHandlerContext } from '../../../data/server';
import { getRemoteRoutePaths } from '../../common';
import { FlameGraph } from './flamegraph';
import { newProjectTimeQuery } from './mappings';

// Return the index that has between sampleSize..sampleSize*5 entries.
// The starting point is the number of entries from the profiling-events-5pow6 index.
// If there
function getSampledTraceEventsIndex(
  sampleSize: number,
  sampleCountFromPow6: number,
  power: number
): [string, number, number] {
  if (sampleCountFromPow6 <= 1) {
    // Since 5^6 = 15625, we can take the shortcut to the full events index.
    return ['profiling-events', 1, sampleSize];
  }

  if (sampleCountFromPow6 >= 5 * sampleSize) {
    // Search in more down-sampled indexes.
    for (let i = 7; i < 11; i++) {
      sampleCountFromPow6 /= 5;
      if (sampleCountFromPow6 < 5 * sampleSize) {
        return ['profiling-events-5pow' + i, 1 / 5 ** i, sampleCountFromPow6];
      }
    }

    // If we come here, it means that the most sparse index still holds too many items.
    // The only problem is the query time, the result set is good.
    return ['profiling-events-5pow11', 1 / 5 ** 11, sampleCountFromPow6];
  } else if (sampleCountFromPow6 < sampleSize) {
    // Search in less down-sampled indexes.
    for (let i = 5; i >= 1; i--) {
      sampleCountFromPow6 *= 5;
      if (sampleCountFromPow6 >= sampleSize) {
        return ['profiling-events-5pow' + i, 1 / 5 ** i, sampleCountFromPow6];
      }
    }

    return ['profiling-events', 1, sampleCountFromPow6 * 5];
  }

  return ['profiling-events', 1, sampleCountFromPow6];
}

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
      const sampleSize = 200;

      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const filter = newProjectTimeQuery(projectID!, timeFrom!, timeTo!);

        // Start with counting the results in the index down-sampled by 5^6.
        // That is in the middle of our down-sampled indexes.
        const pow6 = 6;
        const resp = await esClient.search({
          index: 'profiling-events-5pow' + pow6,
          body: {
            query: filter,
            size: 0,
            track_total_hits: true,
          },
        });
        const sampleCountFromPow6 = resp.body.hits.total.value as number;

        console.log('sampleCountFromPow6', sampleCountFromPow6);

        const [eventsIndex, sampleRate, estimatedSampleCount] = getSampledTraceEventsIndex(
          sampleSize,
          sampleCountFromPow6,
          pow6
        );

        // eslint-disable-next-line no-console
        console.log('Index', eventsIndex, sampleRate, estimatedSampleCount, index);

        const resEvents = await esClient.search({
          index: eventsIndex,
          body: {
            size: 0,
            query: {
              function_score: {
                query: filter,
              },
            },
            aggs: {
              sample: {
                sampler: {
                  shard_size: 100000,
                },
                aggs: {
                  group_by: {
                    terms: {
                      field: 'StackTraceID',
                      size: sampleSize,
                    },
                  },
                },
              },
            },
          },
        });
//        console.log(JSON.stringify(resEvents));

        const resTotalEvents = await esClient.search({
          index,
          body: {
            size: 0,
            query: filter,
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

        const executableDocIDs = new Set<string>();
        for (const trace of resStackTraces.body.docs) {
          if (trace.found) {
            for (const fileID of trace._source.FileID) {
              executableDocIDs.add(fileID);
            }
          }
        }

        const resExecutables = await esClient.mget<any>({
          index: 'profiling-executables',
          body: { ids: [...executableDocIDs] },
        });
//        console.log(JSON.stringify(resExecutables));

        const flamegraph = new FlameGraph(
          resEvents.body,
          resTotalEvents.body,
          resStackTraces.body.docs,
          resStackFrames.body.docs,
          resExecutables.body.docs
        );

        return response.ok({
          body: flamegraph.toElastic(),
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log('Caught', e);
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
