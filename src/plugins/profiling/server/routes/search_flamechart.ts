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

interface FilterObject {
  bool: {
    must: Array<
      | {
          term: {
            ProjectID: {
              value: string;
              boost: number;
            };
          };
        }
      | {
          range: {
            '@timestamp': {
              gte: string;
              lt: string;
              format: string;
              boost: number;
            };
          };
        }
    >;
  };
}

function createFilterObject(projectID: string, timeFrom: string, timeTo: string): FilterObject {
  return {
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
  } as FilterObject;
}

function getSampledTraceEventsIndex(
  sampleSize: number,
  sampleCountFromSmallestTable: number
): [string, number, number] {
  if (sampleCountFromSmallestTable === 0) {
    // If this happens the returned estimatedSampleCount may be very wrong.
    // Hardcode sampleCountFromSmallestTable to 1 else an estimatedSampleCount
    // of zero is returned.
    sampleCountFromSmallestTable = 1;
  }

  const sampleRates: number[] = [1000, 125, 25, 5, 1];

  let tableName: string;
  let sampleRate = 0;
  let estimatedSampleCount = 0;

  for (let i = 0; i < sampleRates.length; i++) {
    sampleRate = sampleRates[i];

    // Fractional floats have an inherent inaccuracy,
    // see https://docs.python.org/3/tutorial/floatingpoint.htm) for details.
    // Examples:
    //   0.01 as float32: 0.009999999776482582092285156250 (< 0.01)
    //   0.01 as float64: 0.010000000000000000208166817117 (> 0.01)
    // But if "N / f >= 1", which is the case below as N is >= 1 and f is <= 1,
    // we end up with the correct result (tested with a small Go program).
    estimatedSampleCount = sampleCountFromSmallestTable * (sampleRates[0] / sampleRate);

    if (estimatedSampleCount >= sampleSize) {
      break;
    }
  }

  if (sampleRate === 1) {
    tableName = 'profiling-events';
  } else {
    tableName = 'profiling-events-' + sampleRate.toString();
  }

  return [tableName, 1 / sampleRate, estimatedSampleCount];
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
        const filter = createFilterObject(projectID!, timeFrom!, timeTo!);

        // const resp = await getCountResponse(context, filter);
        const resp = await esClient.search({
          index: 'profiling-events-1000',
          body: {
            query: filter,
            size: 0,
            track_total_hits: true,
          },
        });

        const sampleCountFromSmallestTable = resp.body.hits.total.value as number;

        const [eventsIndex, sampleRate, estimatedSampleCount] = getSampledTraceEventsIndex(
          sampleSize,
          sampleCountFromSmallestTable
        );

        // eslint-disable-next-line no-console
        console.log('Index', eventsIndex, sampleRate, estimatedSampleCount);

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
                  shard_size: sampleSize,
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
