import type { IRouter } from '../../../../core/server';
import { DataRequestHandlerContext } from '../../../data/server';
import { registerTraceEventsTopNSearchRoute } from './search_profiling';

export function registerRoutes(router: IRouter<DataRequestHandlerContext>) {
  registerTraceEventsTopNSearchRoute(router);
}
