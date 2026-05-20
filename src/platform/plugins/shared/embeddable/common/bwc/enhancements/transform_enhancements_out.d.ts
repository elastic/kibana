import type { SerializedDrilldowns } from '../../../server';
import type { DynamicActionsState } from './dynamic_actions/types';
export declare function transformEnhancementsOut<StoredState extends SerializedDrilldowns>(state: StoredState & {
    enhancements?: {
        dynamicActions?: DynamicActionsState;
    };
}): StoredState;
