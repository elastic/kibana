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
import { getLocalRoutePaths, timeRangeFromRequest } from '../../common';

export function registerTraceEventsTopNContainersRoute(router: IRouter<DataRequestHandlerContext>) {
  const paths = getLocalRoutePaths();
  router.get(
    {
      path: paths.TopNContainers,
      validate: {
        query: schema.object({
          index: schema.maybe(schema.string()),
          projectID: schema.maybe(schema.string()),
          timeFrom: schema.maybe(schema.string()),
          timeTo: schema.maybe(schema.string()),
        }),
      },
    },
    async (ctx, request, response) => {
      const [timeFrom, timeTo] = timeRangeFromRequest(request);
      const src = await import(`../fixtures/containers_${timeTo - timeFrom}`);
      delete src.default;
      return response.ok({ body: src });
    }
  );
}

export function registerTraceEventsTopNDeploymentsRoute(
  router: IRouter<DataRequestHandlerContext>
) {
  const paths = getLocalRoutePaths();
  router.get(
    {
      path: paths.TopNDeployments,
      validate: {
        query: schema.object({
          index: schema.maybe(schema.string()),
          projectID: schema.maybe(schema.string()),
          timeFrom: schema.maybe(schema.string()),
          timeTo: schema.maybe(schema.string()),
        }),
      },
    },
    async (ctx, request, response) => {
      const [timeFrom, timeTo] = timeRangeFromRequest(request);
      const src = await import(`../fixtures/pods_${timeTo - timeFrom}`);
      delete src.default;
      return response.ok({ body: src });
    }
  );
}

export function registerTraceEventsTopNHostsRoute(router: IRouter<DataRequestHandlerContext>) {
  const paths = getLocalRoutePaths();
  router.get(
    {
      path: paths.TopNHosts,
      validate: {
        query: schema.object({
          index: schema.maybe(schema.string()),
          projectID: schema.maybe(schema.string()),
          timeFrom: schema.maybe(schema.string()),
          timeTo: schema.maybe(schema.string()),
        }),
      },
    },
    async (ctx, request, response) => {
      const [timeFrom, timeTo] = timeRangeFromRequest(request);
      const src = await import(`../fixtures/hosts_${timeTo - timeFrom}`);
      delete src.default;
      return response.ok({ body: src });
    }
  );
}

export function registerTraceEventsTopNStackTracesRoute(
  router: IRouter<DataRequestHandlerContext>
) {
  const paths = getLocalRoutePaths();
  router.get(
    {
      path: paths.TopNTraces,
      validate: {
        query: schema.object({
          index: schema.maybe(schema.string()),
          projectID: schema.maybe(schema.string()),
          timeFrom: schema.maybe(schema.string()),
          timeTo: schema.maybe(schema.string()),
        }),
      },
    },
    async (ctx, request, response) => {
      const [timeFrom, timeTo] = timeRangeFromRequest(request);
      const src = await import(`../fixtures/traces_${timeTo - timeFrom}`);
      delete src.default;
      return response.ok({ body: transformFlamechart(src) });
    }
  );
}

export function registerTraceEventsTopNThreadsRoute(router: IRouter<DataRequestHandlerContext>) {
  const paths = getLocalRoutePaths();
  router.get(
    {
      path: paths.TopNThreads,
      validate: {
        query: schema.object({
          index: schema.maybe(schema.string()),
          projectID: schema.maybe(schema.string()),
          timeFrom: schema.maybe(schema.string()),
          timeTo: schema.maybe(schema.string()),
        }),
      },
    },
    async (ctx, request, response) => {
      const [timeFrom, timeTo] = timeRangeFromRequest(request);
      const src = await import(`../fixtures/threads_${timeTo - timeFrom}`);
      delete src.default;
      return response.ok({ body: src });
    }
  );
}

function transformFlamechart(src) {
  const obj = {
    Total: src.TotalTraces,
    TopN: {},
    Metadata: src.TraceDetails,
    SampleRate: src.SampleRate,
  };
  Object.keys(src.TopNTraces).map((key) => {
    obj.TopN[key] = src.TopNTraces[key].map((item) => {
      return { Value: item.TraceHash, Count: item.Count };
    });
  });
  return obj;
}
