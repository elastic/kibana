import type { RequestHandlerContext } from '@kbn/core/server';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import type { DashboardSearchRequestParams, DashboardSearchResponseBody, LegacyDashboardSearchRequestParams, LegacyDashboardSearchResponseBody } from './types';
export declare function search(requestCtx: RequestHandlerContext, searchParams: DashboardSearchRequestParams | LegacyDashboardSearchRequestParams, strictValidationSchema: ReturnType<typeof getDashboardStateSchema>, useAsCodeSearchSchemas: boolean): Promise<DashboardSearchResponseBody | LegacyDashboardSearchResponseBody>;
