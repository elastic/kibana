/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { IRouter, Logger } from 'kibana/server';
import { DataRequestHandlerContext } from '../../../data/server';

import {
  registerFlameChartElasticSearchRoute,
  registerFlameChartPixiSearchRoute,
} from './flamechart';

import {
  registerTraceEventsTopNContainersSearchRoute,
  registerTraceEventsTopNDeploymentsSearchRoute,
  registerTraceEventsTopNHostsSearchRoute,
  registerTraceEventsTopNStackTracesSearchRoute,
  registerTraceEventsTopNThreadsSearchRoute,
} from './topn';

export function registerRoutes(router: IRouter<DataRequestHandlerContext>, logger?: Logger) {
  registerFlameChartElasticSearchRoute(router, logger!);
  registerFlameChartPixiSearchRoute(router, logger!);
  registerTraceEventsTopNContainersSearchRoute(router, logger!);
  registerTraceEventsTopNDeploymentsSearchRoute(router, logger!);
  registerTraceEventsTopNHostsSearchRoute(router, logger!);
  registerTraceEventsTopNStackTracesSearchRoute(router, logger!);
  registerTraceEventsTopNThreadsSearchRoute(router, logger!);
}
