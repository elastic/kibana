import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { VisualizeAppState, VisualizeAppStateTransitions } from '../types';
interface Arguments {
    kbnUrlStateStorage: IKbnUrlStateStorage;
    stateDefaults: VisualizeAppState;
    byValue?: boolean;
}
export declare function createVisualizeAppState({ stateDefaults, kbnUrlStateStorage, byValue }: Arguments): {
    stateContainer: import("@kbn/kibana-utils-plugin/public").ReduxLikeStateContainer<VisualizeAppState, VisualizeAppStateTransitions, {}>;
    stopStateSync: () => void;
};
export {};
