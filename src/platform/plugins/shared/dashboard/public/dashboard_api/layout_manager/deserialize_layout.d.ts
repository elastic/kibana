import { type DashboardState } from '../../../common';
import type { DashboardChildState, DashboardLayout } from './types';
export declare function deserializeLayout(panels: DashboardState['panels'], pinnedPanels: DashboardState['pinned_panels']): {
    layout: DashboardLayout;
    childState: DashboardChildState;
};
