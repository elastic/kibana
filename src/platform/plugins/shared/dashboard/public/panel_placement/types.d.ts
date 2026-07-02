import type { GridData } from '../../server';
import type { DashboardLayout } from '../dashboard_api/layout_manager';
export interface PanelPlacementReturn {
    newPanelPlacement: GridData;
    otherPanels: DashboardLayout['panels'];
}
export interface PanelPlacementProps {
    width: number;
    height: number;
    currentPanels: DashboardLayout['panels'];
    sectionId?: string;
    beside?: string;
}
