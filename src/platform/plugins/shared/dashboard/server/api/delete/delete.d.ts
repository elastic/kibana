import type { RequestHandlerContext } from '@kbn/core/server';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import type { DashboardDeleteResponseBody } from './types';
export declare function deleteDashboard(requestCtx: RequestHandlerContext, id: string, strictValidationSchema: ReturnType<typeof getDashboardStateSchema>): Promise<DashboardDeleteResponseBody>;
