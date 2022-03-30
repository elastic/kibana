/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';
import type { IRouter, KibanaResponseFactory, Logger } from 'kibana/server';
import {
  AggregationsHistogramAggregate,
  AggregationsHistogramBucket,
  AggregationsStringTermsBucket,
} from '@elastic/elasticsearch/lib/api/types';
import type { DataRequestHandlerContext } from '../../../data/server';
import { getRemoteRoutePaths } from '../../common';
import { logExecutionLatency } from './logger';
import { autoHistogramSumCountOnGroupByField, newProjectTimeQuery } from './mappings';

export async function topNElasticSearchQuery(
  context: DataRequestHandlerContext,
  logger: Logger,
  index: string,
  projectID: string,
  timeFrom: string,
  timeTo: string,
  topNItems: number,
  searchField: string,
  response: KibanaResponseFactory
) {
  const esClient = context.core.elasticsearch.client.asCurrentUser;

  const resTopNStackTraces = await logExecutionLatency(
    logger,
    'query to find TopN stacktraces',
    async () => {
      return await esClient.search({
        index,
        body: {
          query: newProjectTimeQuery(projectID, timeFrom, timeTo),
          aggs: {
            histogram: autoHistogramSumCountOnGroupByField(searchField, topNItems),
          },
        },
      });
    }
  );

  if (searchField !== 'StackTraceID') {
    return response.ok({
      body: {
        topN: resTopNStackTraces.body.aggregations,
      },
    });
  }

  const docIDs: string[] = [];

  (
    resTopNStackTraces.body.aggregations?.histogram as AggregationsHistogramAggregate
  ).buckets.forEach((timeInterval: AggregationsHistogramBucket) => {
    timeInterval.group_by.buckets.forEach((stackTraceItem: AggregationsStringTermsBucket) => {
      docIDs.push(stackTraceItem.key);
    });
  });

  const resTraceMetadata = await logExecutionLatency(
    logger,
    'query for ' + docIDs.length + ' stacktraces',
    async () => {
      return await esClient.mget({
        index: 'profiling-stacktraces',
        body: { ids: docIDs },
      });
    }
  );

  return response.ok({
    body: {
      topN: resTopNStackTraces.body.aggregations,
      traceMetadata: resTraceMetadata.body.docs,
    },
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

      try {
        return await topNElasticSearchQuery(
          context,
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
  const paths = getRemoteRoutePaths();
  return queryTopNCommon(router, logger, paths.TopNContainers, 'ContainerName');
}

export function registerTraceEventsTopNDeploymentsSearchRoute(
  router: IRouter<DataRequestHandlerContext>,
  logger: Logger
) {
  const paths = getRemoteRoutePaths();
  return queryTopNCommon(router, logger, paths.TopNDeployments, 'PodName');
}

export function registerTraceEventsTopNHostsSearchRoute(
  router: IRouter<DataRequestHandlerContext>,
  logger: Logger
) {
  const paths = getRemoteRoutePaths();
  return queryTopNCommon(router, logger, paths.TopNHosts, 'HostID');
}

export function registerTraceEventsTopNStackTracesSearchRoute(
  router: IRouter<DataRequestHandlerContext>,
  logger: Logger
) {
  const paths = getRemoteRoutePaths();
  return queryTopNCommon(router, logger, paths.TopNTraces, 'StackTraceID');
}

export function registerTraceEventsTopNThreadsSearchRoute(
  router: IRouter<DataRequestHandlerContext>,
  logger: Logger
) {
  const paths = getRemoteRoutePaths();
  return queryTopNCommon(router, logger, paths.TopNThreads, 'ThreadName');
}
