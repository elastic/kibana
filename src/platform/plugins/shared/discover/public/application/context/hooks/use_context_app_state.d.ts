import type { DataView } from '@kbn/data-views-plugin/common';
import type { DiscoverServices } from '../../../build_services';
import type { AppState, GlobalState } from '../services/context_state';
export declare function useContextAppState({ services, dataView, }: {
    services: DiscoverServices;
    dataView: DataView;
}): {
    appState: AppState;
    globalState: GlobalState;
    stateContainer: import("../services/context_state").GetStateReturn;
};
