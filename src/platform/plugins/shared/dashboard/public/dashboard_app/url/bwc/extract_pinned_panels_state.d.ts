import type { DashboardState } from '../../../../common';
export declare function extractPinnedPanelsState(state: {
    [key: string]: unknown;
}): {
    pinned_panels?: DashboardState['pinned_panels'];
    autoApplyFilters?: boolean;
};
