import type { UserActivityObject } from '@kbn/core-user-activity-server';
import type { KibanaRequest } from '@kbn/core/server';
import type { DashboardCreateResponseBody } from '../api/create';
import type { DashboardDeleteResponseBody } from '../api/delete';
import type { DashboardState } from '../api/types';
import type { DashboardUpdateResponseBody } from '../api/update';
export declare function trackCreateDashboardAction(result: DashboardCreateResponseBody, request: KibanaRequest): Promise<void>;
export declare function trackUpdateDashboardAction(result: DashboardUpdateResponseBody, request: KibanaRequest): Promise<void>;
export declare function trackDeleteDashboardAction(result: DashboardDeleteResponseBody, request: KibanaRequest): Promise<void>;
export declare function getUserActivityObject(result: {
    id: string;
    data: Pick<DashboardState, 'title' | 'tags'>;
}, request: KibanaRequest): Promise<UserActivityObject>;
