import type { ControlWidth as PinnedPanelWidth, PinnedControlLayoutState as PinnedPanelLayoutState } from '@kbn/controls-schemas';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { DashboardPanel, DashboardSection } from '../../../server';
export interface DashboardChildren {
    [uuid: string]: DefaultEmbeddableApi;
}
export interface DashboardLayoutPanel {
    grid: DashboardPanel['grid'] & {
        sectionId?: string;
    };
    type: DashboardPanel['type'];
}
export declare const isDashboardLayoutPanel: (panel: unknown) => panel is DashboardLayoutPanel;
export interface DashboardPinnablePanel {
    type: DashboardPanel['type'];
    grow?: boolean;
    width?: PinnedPanelWidth;
    order?: number;
}
export interface DashboardLayout {
    panels: {
        [uuid: string]: DashboardLayoutPanel;
    };
    sections: {
        [id: string]: Pick<DashboardSection, 'collapsed' | 'grid' | 'title'>;
    };
    pinnedPanels: {
        [id: string]: PinnedPanelLayoutState;
    };
}
export interface DashboardChildState {
    [uuid: string]: object;
}
