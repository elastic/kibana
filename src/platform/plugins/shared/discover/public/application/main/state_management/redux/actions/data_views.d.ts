import type { DataView } from '@kbn/data-views-plugin/public';
import { type InternalStateThunkActionCreator } from '../internal_state';
export declare const loadDataViewList: import("@reduxjs/toolkit").AsyncThunk<import("@kbn/data-views-plugin/public").DataViewListItem[], void, {
    state: import("..").DiscoverInternalState;
    dispatch: import("../internal_state").InternalStateDispatch;
    extra: import("../internal_state").InternalStateDependencies;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export declare const setAdHocDataViews: InternalStateThunkActionCreator<[DataView[]]>;
export declare const setDefaultProfileAdHocDataViews: InternalStateThunkActionCreator<[DataView[]]>;
export declare const appendAdHocDataViews: InternalStateThunkActionCreator<[DataView | DataView[]]>;
export declare const replaceAdHocDataViewWithId: InternalStateThunkActionCreator<[string, DataView]>;
