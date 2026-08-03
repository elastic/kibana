import type { RequestTiming } from '@kbn/core-http-server';
import type { RequestHandlerContext } from '@kbn/core/server';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import type { DashboardState } from '../types';
import type { DashboardCreateResponseBody } from './types';
export declare function create(requestCtx: RequestHandlerContext, strictValidationSchema: ReturnType<typeof getDashboardStateSchema>, createBody: DashboardState, serverTiming?: RequestTiming, isDashboardAppRequest?: boolean, id?: string): Promise<DashboardCreateResponseBody>;
