import type { SavedObjectAccessControl, SavedObjectReference } from '@kbn/core/server';
import type { DashboardSavedObjectAttributes } from '../dashboard_saved_object';
export interface DashboardHit {
    attributes: DashboardSavedObjectAttributes;
    references: SavedObjectReference[];
    accessControl?: SavedObjectAccessControl;
}
export interface DashboardCollectorData {
    panels: {
        total: number;
        by_reference: number;
        by_value: number;
        by_type: {
            [key: string]: {
                total: number;
                by_reference: number;
                by_value: number;
                details: {
                    [key: string]: number;
                };
            };
        };
    };
    controls: {
        total: number;
        by_type: {
            [key: string]: {
                total: number;
            };
        };
    };
    sections: {
        total: number;
    };
    access_mode: {
        [key: string]: {
            total: number;
        };
    };
}
