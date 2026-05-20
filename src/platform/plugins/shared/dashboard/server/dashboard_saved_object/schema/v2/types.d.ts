import type { TypeOf } from '@kbn/config-schema';
import type { Serializable } from '@kbn/utility-types';
import type { dashboardAttributesSchema, gridDataSchema } from './v2';
export type DashboardAttributes = TypeOf<typeof dashboardAttributesSchema>;
export type GridData = TypeOf<typeof gridDataSchema>;
/**
 * A saved dashboard panel parsed directly from the Dashboard Attributes panels JSON
 */
export interface SavedDashboardPanel {
    embeddableConfig: {
        [key: string]: Serializable;
    };
    type: string;
    gridData: GridData;
    panelIndex: string;
    /**
     * This version key was used to store Kibana version information from versions 7.3.0 -> 8.11.0.
     * As of version 8.11.0, the versioning information is now per-embeddable-type and is stored on the
     * embeddable's input. (embeddableConfig in this type).
     */
    version?: string;
    /**
     * Legacy keys that are not longer populated.
     * Legacy saved objects may still include keys
     */
    id?: string;
    panelRefName?: string;
    title?: string;
}
