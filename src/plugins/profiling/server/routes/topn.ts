/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient, IRouter, KibanaResponseFactory, Logger } from 'kibana/server';
import {
  AggregationsHistogramAggregate,
  AggregationsHistogramBucket,
  AggregationsStringTermsBucket,
} from '@elastic/elasticsearch/lib/api/types';
import type { DataRequestHandlerContext } from '../../../data/server';
import { fromMapToRecord, getRoutePaths } from '../../common';
import { groupStackFrameMetadataByStackTrace, StackTraceID } from '../../common/profiling';
import { createTopNBucketsByDate } from '../../common/topn';
import { findDownsampledIndex } from './downsampling';
import { logExecutionLatency } from './logger';
import { autoHistogramSumCountOnGroupByField, newProjectTimeQuery } from './mappings';
import { mgetExecutables, mgetStackFrames, mgetStackTraces } from './stacktrace';
import { getClient, getAggs } from './compat';

export async function topNElasticSearchQuery(
  client: ElasticsearchClient,
  logger: Logger,
  index: string,
  projectID: string,
  timeFrom: string,
  timeTo: string,
  topNItems: number,
  searchField: string,
  response: KibanaResponseFactory
) {
  const filter = newProjectTimeQuery(projectID, timeFrom, timeTo);
  const targetSampleSize = 20000; // minimum number of samples to get statistically sound results

  const eventsIndex = await logExecutionLatency(
    logger,
    'query to find downsampled index',
    async () => {
      return await findDownsampledIndex(logger, client, index, filter, targetSampleSize);
    }
  );

  const resEvents = await logExecutionLatency(
    logger,
    'query to fetch events from ' + eventsIndex.name,
    async () => {
      return await client.search(
        {
          index: eventsIndex.name,
          size: 0,
          query: filter,
          aggs: {
            histogram: autoHistogramSumCountOnGroupByField(searchField, topNItems),
          },
        },
        {
          // Adrien and Dario found out this is a work-around for some bug in 8.1.
          // It reduces the query time by avoiding unneeded searches.
          querystring: {
            pre_filter_shard_size: 1,
          },
        }
      );
    }
  );

  const histogram = getAggs(resEvents)?.histogram as AggregationsHistogramAggregate;
  const topN = createTopNBucketsByDate(histogram);

  if (searchField !== 'StackTraceID') {
    return response.ok({
      body: topN,
    });
  }

  let totalCount = 0;
  const stackTraceEvents = new Map<StackTraceID, number>();

  const histogramBuckets = (histogram?.buckets as AggregationsHistogramBucket[]) ?? [];
  for (let i = 0; i < histogramBuckets.length; i++) {
    totalCount += histogramBuckets[i].doc_count;
    histogramBuckets[i].group_by.buckets.forEach(
      (stackTraceItem: AggregationsStringTermsBucket) => {
        stackTraceEvents.set(stackTraceItem.key, stackTraceItem.count.value);
      }
    );
  }

  logger.info('events total count: ' + totalCount);
  logger.info('unique stacktraces: ' + stackTraceEvents.size);

  // profiling-stacktraces is configured with 16 shards
  const { stackTraces, stackFrameDocIDs, executableDocIDs } = await mgetStackTraces(
    logger,
    client,
    stackTraceEvents
  );

  return Promise.all([
    mgetStackFrames(logger, client, stackFrameDocIDs),
    mgetExecutables(logger, client, executableDocIDs),
  ]).then(([stackFrames, executables]) => {
    const metadata = fromMapToRecord(
      groupStackFrameMetadataByStackTrace(stackTraces, stackFrames, executables)
    );
    return response.ok({
      body: {
        ...topN,
        Metadata: metadata,
      },
    });
  });
}

export function queryTopNCommon(
  router: IRouter<DataRequestHandlerContext>,
  logger: Logger,
  pathName: string,
  searchField: string
) {
  router.get(
    {
      path: pathName,
      validate: {
        query: schema.object({
          index: schema.string(),
          projectID: schema.string(),
          timeFrom: schema.string(),
          timeTo: schema.string(),
          n: schema.number(),
        }),
      },
    },
    async (context, request, response) => {
      const { index, projectID, timeFrom, timeTo, n } = request.query;
      const client = await getClient(context);

      try {
        return await topNElasticSearchQuery(
          client,
          logger,
          index,
          projectID,
          timeFrom,
          timeTo,
          n,
          searchField,
          response
        );
      } catch (e) {
        return response.customError({
          statusCode: e.statusCode ?? 500,
          body: {
            message: 'Profiling TopN request failed: ' + e.message + '; full error ' + e.toString(),
          },
        });
      }
    }
  );
}

export function registerTraceEventsTopNContainersSearchRoute(
  router: IRouter<DataRequestHandlerContext>,
  logger: Logger
) {
  const paths = getRoutePaths();
  return queryTopNCommon(router, logger, paths.TopNContainers, 'ContainerName');
}

export function registerTraceEventsTopNDeploymentsSearchRoute(
  router: IRouter<DataRequestHandlerContext>,
  logger: Logger
) {
  const paths = getRoutePaths();
  return queryTopNCommon(router, logger, paths.TopNDeployments, 'PodName');
}

export function registerTraceEventsTopNHostsSearchRoute(
  router: IRouter<DataRequestHandlerContext>,
  logger: Logger
) {
  const paths = getRoutePaths();
  return queryTopNCommon(router, logger, paths.TopNHosts, 'HostID');
}

export function registerTraceEventsTopNStackTracesSearchRoute(
  router: IRouter<DataRequestHandlerContext>,
  logger: Logger
) {
  const paths = getRoutePaths();
  return queryTopNCommon(router, logger, paths.TopNTraces, 'StackTraceID');
}

export function registerTraceEventsTopNThreadsSearchRoute(
  router: IRouter<DataRequestHandlerContext>,
  logger: Logger
) {
  const paths = getRoutePaths();
  return queryTopNCommon(router, logger, paths.TopNThreads, 'ThreadName');
}
