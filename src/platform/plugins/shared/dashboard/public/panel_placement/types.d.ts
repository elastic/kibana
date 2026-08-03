import type { DashboardLayout, DashboardLayoutPanel } from '../dashboard_api/layout_manager';
export type PanelPlacementReturn = DashboardLayout;
export interface PanelPlacementProps {
    newPanel: {
        uuid: string;
        type: DashboardLayoutPanel['type'];
        grid: Pick<DashboardLayoutPanel['grid'], 'sectionId' | 'w' | 'h'>;
    };
    currentLayout: DashboardLayout;
    beside?: string;
}
