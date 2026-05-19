import type { DashboardState } from '../../types';
export declare function transformSearchSourceIn(filters?: DashboardState['filters'], query?: DashboardState['query']): {
    searchSourceJSON: string;
    references: import("@kbn/core/packages/saved-objects/api-server").SavedObjectReference[];
};
