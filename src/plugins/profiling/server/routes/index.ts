/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { IRouter, Logger } from 'kibana/server';
import { DataRequestHandlerContext } from '../../../data/server';
import { registerFlameChartElasticRoute, registerFlameChartPixiRoute } from './load_flamechart';
import {
  registerTraceEventsTopNContainersRoute,
  registerTraceEventsTopNDeploymentsRoute,
  registerTraceEventsTopNHostsRoute,
  registerTraceEventsTopNStackTracesRoute,
  registerTraceEventsTopNThreadsRoute,
} from './load_topn';

import { registerFlameChartSearchRoute } from './search_flamechart';
import {
  registerTraceEventsTopNContainersSearchRoute,
  registerTraceEventsTopNDeploymentsSearchRoute,
  registerTraceEventsTopNHostsSearchRoute,
  registerTraceEventsTopNStackTracesSearchRoute,
  registerTraceEventsTopNThreadsSearchRoute,
} from './search_topn';

export function registerRoutes(router: IRouter<DataRequestHandlerContext>, logger?: Logger) {
  registerFlameChartElasticRoute(router);
  registerFlameChartPixiRoute(router);
  registerTraceEventsTopNContainersRoute(router);
  registerTraceEventsTopNDeploymentsRoute(router);
  registerTraceEventsTopNHostsRoute(router);
  registerTraceEventsTopNStackTracesRoute(router);
  registerTraceEventsTopNThreadsRoute(router);

  registerFlameChartSearchRoute(router, logger!);
  registerTraceEventsTopNContainersSearchRoute(router);
  registerTraceEventsTopNDeploymentsSearchRoute(router);
  registerTraceEventsTopNHostsSearchRoute(router);
  registerTraceEventsTopNStackTracesSearchRoute(router);
  registerTraceEventsTopNThreadsSearchRoute(router);
}
