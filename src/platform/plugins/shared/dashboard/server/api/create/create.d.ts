import type { RequestHandlerContext } from '@kbn/core/server';
import type { RequestTiming } from '@kbn/core-http-server';
import type { DashboardCreateResponseBody } from './types';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import type { DashboardState } from '../types';
export declare function create(requestCtx: RequestHandlerContext, dashboardStateSchema: ReturnType<typeof getDashboardStateSchema>, createBody: DashboardState, serverTiming?: RequestTiming, isDashboardAppRequest?: boolean, id?: string): Promise<DashboardCreateResponseBody>;
