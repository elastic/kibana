export interface SaveDiscoverSessionThunkParams {
    newTitle: string;
    newTimeRestore: boolean;
    newCopyOnSave: boolean;
    newDescription: string;
    newTags: string[];
}
export declare const saveDiscoverSession: import("@reduxjs/toolkit").AsyncThunk<{
    discoverSession: import("@kbn/saved-search-plugin/common").DiscoverSession | undefined;
    nextSelectedTabId: string;
}, SaveDiscoverSessionThunkParams, {
    state: import("../types").DiscoverInternalState;
    dispatch: import("..").InternalStateDispatch;
    extra: import("..").InternalStateDependencies;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
