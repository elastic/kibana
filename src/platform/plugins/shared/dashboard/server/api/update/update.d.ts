import type { RequestHandlerContext } from '@kbn/core/server';
import type { RequestTiming } from '@kbn/core-http-server';
import type { DashboardUpdateResponseBody } from './types';
import type { DashboardCreateResponseBody } from '../create';
import type { getDashboardStateSchema } from '../dashboard_state_schemas';
import type { DashboardState, Operation } from '../types';
/**
 * Upserts a dashboard by id — creates it if it doesn't exist, or updates it if it does.
 *
 * @remarks
 * This cannot use a simple `client.update({ upsert })` because the Saved Objects `update` API
 * does not accept `accessControl` options. To explicitly set `accessControl` on a new document,
 * or to change the access mode of an existing document, we must use `create()` and
 * `changeAccessMode()` respectively.
 *
 */
export declare function update(requestCtx: RequestHandlerContext, dashboardStateSchema: ReturnType<typeof getDashboardStateSchema>, id: string, updateBody: DashboardState, serverTiming?: RequestTiming, isDashboardAppRequest?: boolean): Promise<{
    body: DashboardCreateResponseBody | DashboardUpdateResponseBody;
    operation: Operation;
}>;
