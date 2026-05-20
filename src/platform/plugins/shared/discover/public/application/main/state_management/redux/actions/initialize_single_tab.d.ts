import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import { type TabActionPayload } from '../internal_state';
import { type DiscoverAppState } from '..';
import type { DiscoverDataStateContainer } from '../../discover_data_state_container';
import type { ConnectedCustomizationService } from '../../../../../customizations';
export interface InitializeSingleTabsParams {
    customizationService: ConnectedCustomizationService;
    dataStateContainer: DiscoverDataStateContainer;
    dataViewSpec: DataViewSpec | undefined;
    esqlControls: ControlPanelsState<OptionsListESQLControlState> | undefined;
    defaultUrlState: DiscoverAppState | undefined;
}
export declare const initializeSingleTab: import("@reduxjs/toolkit").AsyncThunk<{
    showNoDataPage: boolean;
}, TabActionPayload<{
    initializeSingleTabParams: InitializeSingleTabsParams;
}>, {
    state: import("..").DiscoverInternalState;
    dispatch: import("..").InternalStateDispatch;
    extra: import("..").InternalStateDependencies;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
