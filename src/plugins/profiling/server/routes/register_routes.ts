/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { IRouter } from '../../../../core/server';
import { DataRequestHandlerContext } from '../../../data/server';

import { registerFlameChartElasticRoute } from './load_flameChartElastic';
import { registerFlameChartPixiRoute } from './load_flameChartPixi';
import { registerTraceEventsTopNContainersRoute } from './load_topNContainers';
import { registerTraceEventsTopNDeploymentsRoute } from './load_topNDeployments';
import { registerTraceEventsTopNHostsRoute } from './load_topNHosts';
import { registerTraceEventsTopNStackTracesRoute } from './load_topNStackTraces';
import { registerTraceEventsTopNThreadsRoute } from './load_topNThreads';

import { registerFlameChartSearchRoute } from './search_flameChart';
import { registerTraceEventsTopNContainersSearchRoute } from './search_topNContainers';
import { registerTraceEventsTopNDeploymentsSearchRoute } from './search_topNDeployments';
import { registerTraceEventsTopNHostsSearchRoute } from './search_topNHosts';
import { registerTraceEventsTopNStackTracesSearchRoute } from './search_topNStackTraces';
import { registerTraceEventsTopNThreadsSearchRoute } from './search_topNThreads';

export function registerRoutes(router: IRouter<DataRequestHandlerContext>) {
  registerFlameChartElasticRoute(router);
  registerFlameChartPixiRoute(router);
  registerTraceEventsTopNContainersRoute(router);
  registerTraceEventsTopNDeploymentsRoute(router);
  registerTraceEventsTopNHostsRoute(router);
  registerTraceEventsTopNStackTracesRoute(router);
  registerTraceEventsTopNThreadsRoute(router);

  registerFlameChartSearchRoute(router);
  registerTraceEventsTopNContainersSearchRoute(router);
  registerTraceEventsTopNDeploymentsSearchRoute(router);
  registerTraceEventsTopNHostsSearchRoute(router);
  registerTraceEventsTopNStackTracesSearchRoute(router);
  registerTraceEventsTopNThreadsSearchRoute(router);
}
