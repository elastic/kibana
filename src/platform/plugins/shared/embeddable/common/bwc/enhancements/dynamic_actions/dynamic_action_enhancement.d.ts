import type { Reference } from '@kbn/content-management-utils';
import type { DynamicActionsState } from './types';
export declare const dynamicActionsPersistableState: {
    extract: (state: DynamicActionsState) => {
        state: DynamicActionsState;
        references: Reference[];
    };
    inject: (state: DynamicActionsState, references: Reference[]) => DynamicActionsState;
    telemetry(state: DynamicActionsState, telemetryData: Record<string, number>): {
        [x: string]: number;
    };
};
