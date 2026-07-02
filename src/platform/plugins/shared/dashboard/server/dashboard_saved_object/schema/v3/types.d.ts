import type { TypeOf } from '@kbn/config-schema';
import type { SavedDashboardPanel as SavedDashboardPanelV2 } from '../v2';
import type { dashboardAttributesSchema, gridDataSchema, sectionSchema } from './v3';
/** The attributes of a dashboard saved object. */
export type DashboardAttributes = TypeOf<typeof dashboardAttributesSchema> & {
    projectRouting?: string;
} & {
    /**
     * To avoid defining a new SO version, I am adding the new key `pinned_panels` here
     * rather than as part of the dashboard attributes schema
     */
    pinned_panels?: {
        panels: {
            [uuid: string]: {
                type: string;
                order: number;
                width?: string;
                grow?: boolean;
                config: object;
            };
        };
    };
};
export type GridData = TypeOf<typeof gridDataSchema>;
/**
 * A saved dashboard panel parsed directly from the Dashboard Attributes panels JSON
 */
export type SavedDashboardPanel = Omit<SavedDashboardPanelV2, 'gridData'> & {
    gridData: GridData;
};
/**
 * A saved dashboard section parsed directly from the Dashboard Attributes
 */
export type SavedDashboardSection = TypeOf<typeof sectionSchema>;
