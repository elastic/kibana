import type { Reference } from '@kbn/content-management-utils';
import type { SerializedAction, SerializedEvent } from './types';
export declare const EMBEDDABLE_TO_DASHBOARD_DRILLDOWN = "DASHBOARD_TO_DASHBOARD_DRILLDOWN";
export declare const generateRefName: (eventId: string) => string;
export declare const dashboardDrilldownPersistableState: {
    extract: (state: SerializedEvent) => {
        state: {
            action: SerializedAction;
            eventId: string;
            triggers: string[];
        };
        references: Reference[];
    };
    inject: (state: SerializedEvent, references: Reference[]) => SerializedEvent;
};
