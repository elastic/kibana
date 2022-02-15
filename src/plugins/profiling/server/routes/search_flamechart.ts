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

export interface DownsampledEventsIndex {
  name: string;
  sampleRate: number;
}

const downsampledIndex = 'profiling-events-5pow';

// Return the index that has between targetSampleSize..targetSampleSize*samplingFactor entries.
// The starting point is the number of entries from the profiling-events-5pow<initialExp> index.
//
// More details on how the down-sampling works can be found at the write path
//   https://github.com/elastic/prodfiler/blob/bdcc2711c6cd7e89d63b58a17329fb9fdbabe008/pf-elastic-collector/elastic.go
export function getSampledTraceEventsIndex(
  targetSampleSize: number,
  sampleCountFromInitialExp: number,
  initialExp: number
): DownsampledEventsIndex {
  const maxExp = 11;
  const samplingFactor = 5;
  const fullEventsIndex: DownsampledEventsIndex = { name: 'profiling-events', sampleRate: 1 };

  if (sampleCountFromInitialExp === 0) {
    // Take the shortcut to the full events index.
    return fullEventsIndex;
  }

  if (sampleCountFromInitialExp >= samplingFactor * targetSampleSize) {
    // Search in more down-sampled indexes.
    for (let i = initialExp + 1; i <= maxExp; i++) {
      sampleCountFromInitialExp /= samplingFactor;
      if (sampleCountFromInitialExp < samplingFactor * targetSampleSize) {
        return { name: downsampledIndex + i, sampleRate: 1 / samplingFactor ** i };
      }
    }
    // If we come here, it means that the most sparse index still holds too many items.
    // The only problem is the query time, the result set is good.
    return { name: downsampledIndex + 11, sampleRate: 1 / samplingFactor ** maxExp };
  } else if (sampleCountFromInitialExp < targetSampleSize) {
    // Search in less down-sampled indexes.
    for (let i = initialExp -1; i >= 1; i--) {
      sampleCountFromInitialExp *= samplingFactor;
      if (sampleCountFromInitialExp >= targetSampleSize) {
        return { name: downsampledIndex + i, sampleRate: 1 / samplingFactor ** i };
      }
    }

    return fullEventsIndex;
  }

  return { name: downsampledIndex + initialExp, sampleRate: 1 / samplingFactor ** initialExp };
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
          n: schema.maybe(schema.number()),
        }),
      },
    },
    async (context, request, response) => {
      const { projectID, timeFrom, timeTo } = request.query;
      const targetSampleSize = 20000; // minimum number of samples to get statistically sound results
      const topN = 200; // collect data for the top N unique stack traces

      try {
        const esClient = context.core.elasticsearch.client.asCurrentUser;
        const filter = newProjectTimeQuery(projectID!, timeFrom!, timeTo!);

        // Start with counting the results in the index down-sampled by 5^6.
        // That is in the middle of our down-sampled indexes.
        const initialExp = 6;
        const resp = await esClient.search({
          index: downsampledIndex + initialExp,
          body: {
            query: filter,
            size: 0,
            track_total_hits: true,
          },
        });
        const sampleCountFromInitialExp = resp.body.hits.total.value as number;

        console.log('sampleCountFromPow6', sampleCountFromInitialExp);

        const eventsIndex = getSampledTraceEventsIndex(
          targetSampleSize,
          sampleCountFromInitialExp,
          initialExp
        );

        // eslint-disable-next-line no-console
        console.log('EventsIndex', eventsIndex);

        const resEvents = await esClient.search({
          index: eventsIndex.name,
          body: {
            size: 0,
            query: filter,
            aggs: {
              group_by: {
                terms: {
                  field: 'StackTraceID',
                  size: topN,
                },
                aggs: {
                  sum_count: {
                    sum: {
                      field: 'Count',
                    },
                  },
                },
              },
              total_count: {
                sum: {
                  field: 'Count',
                },
              },
            },
          },
        });
        // console.log(JSON.stringify(resEvents, null, 2));

        const tracesDocIDs: string[] = [];
        let sumCount = 0;
        let docCount = 0;
        resEvents.body.aggregations.group_by.buckets.forEach((stackTraceItem: any) => {
          tracesDocIDs.push(stackTraceItem.key);
          sumCount += stackTraceItem.sum_count.value;
          docCount += stackTraceItem.doc_count;
        });
        const totalCount: number = resEvents.body.aggregations.total_count.value;
        const otherDocCount: number = resEvents.body.aggregations.group_by.sum_other_doc_count;

        console.log('docCount', docCount, 'otherDocCount', otherDocCount);
        console.log('sumCount', sumCount, 'totalCount', totalCount);

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
          eventsIndex.sampleRate,
          totalCount,
          resEvents.body,
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
