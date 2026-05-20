import type { Reference } from '@kbn/content-management-utils';
import type { DashboardDrilldownState, StoredDashboardDrilldownState } from './types';
export declare function transformIn(state: DashboardDrilldownState): {
    state: StoredDashboardDrilldownState;
    references?: Reference[];
};
export declare function transformOut(storedState: StoredDashboardDrilldownState, references?: Reference[]): DashboardDrilldownState;
