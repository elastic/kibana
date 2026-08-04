import type { DashboardLayout } from './types';
/**
 * Checks whether the layouts have the same keys, and if they do, checks whether every layout item in the
 * original layout is deep equal to the layout item at the same ID in the new layout
 */
export declare const areLayoutsEqual: (originalLayout?: DashboardLayout, newLayout?: DashboardLayout) => boolean;
export declare const arePanelLayoutsEqual: (originalLayout?: DashboardLayout, newLayout?: DashboardLayout) => boolean;
export declare const arePinnedPanelLayoutsEqual: (originalLayout?: DashboardLayout, newLayout?: DashboardLayout) => boolean;
