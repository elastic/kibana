import type { RequestHandlerContext } from '@kbn/core/server';
import type { DashboardSearchRequestParams, DashboardSearchResponseBody } from './types';
export declare function search(requestCtx: RequestHandlerContext, searchParams: DashboardSearchRequestParams): Promise<DashboardSearchResponseBody>;
