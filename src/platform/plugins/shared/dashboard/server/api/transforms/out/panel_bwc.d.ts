import type { SavedObjectReference } from '@kbn/core/server';
import type { SavedDashboardPanel } from '../../../dashboard_saved_object';
export declare function panelBwc(panel: SavedDashboardPanel, panelReferences: SavedObjectReference[]): {
    panel: {
        embeddableConfig: {
            title?: string | undefined;
        };
        type: string;
        version?: string | undefined;
        panelIndex: string;
        gridData: import("../../../dashboard_saved_object").GridData;
    };
    panelReferences: SavedObjectReference[];
};
export declare function transformPanelReferencesOut(panelReferences: SavedObjectReference[], panelRefName?: string): SavedObjectReference[];
