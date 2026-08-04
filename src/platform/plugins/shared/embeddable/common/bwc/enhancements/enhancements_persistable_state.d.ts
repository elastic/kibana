import type { SerializableRecord } from '@kbn/utility-types';
import type { Reference } from '@kbn/content-management-utils';
import type { DynamicActionsState } from './dynamic_actions/types';
export declare const enhancementsPersistableState: {
    extract: (enhancementsState: SerializableRecord) => {
        state: SerializableRecord;
        references: never[];
    } | {
        state: {
            dynamicActions: DynamicActionsState;
        };
        references: Reference[];
    };
    inject: (enhancementsState: SerializableRecord, references: Reference[]) => SerializableRecord | {
        dynamicActions: DynamicActionsState;
    };
    telemetry(enhancementsState: SerializableRecord, telemetryData?: Record<string, any>): Record<string, any>;
};
