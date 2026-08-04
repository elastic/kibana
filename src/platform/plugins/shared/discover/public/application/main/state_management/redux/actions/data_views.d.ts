import type { DataView } from '@kbn/data-views-plugin/public';
import { type InternalStateThunkActionCreator } from '../internal_state';
export declare const loadDataViewList: import("redux-toolkit-v1").AsyncThunk<import("@kbn/data-views-plugin/public").DataViewListItem[], void, {
    state: import("..").DiscoverInternalState;
    dispatch: import("..").InternalStateDispatch;
    extra: import("..").InternalStateDependencies;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const setAdHocDataViews: InternalStateThunkActionCreator<[DataView[]]>;
export declare const updateAdHocDataViews: InternalStateThunkActionCreator<[DataView[]], Promise<void>>;
export declare const setDefaultProfileAdHocDataViews: InternalStateThunkActionCreator<[DataView[]]>;
export declare const appendAdHocDataViews: InternalStateThunkActionCreator<[DataView | DataView[]]>;
export declare const replaceAdHocDataViewWithId: InternalStateThunkActionCreator<[string, DataView]>;
