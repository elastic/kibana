import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
export declare const resetDiscoverSession: import("@reduxjs/toolkit").AsyncThunk<void, {
    updatedDiscoverSession?: DiscoverSession;
    nextSelectedTabId?: string;
} | undefined, {
    state: import("../types").DiscoverInternalState;
    dispatch: import("../internal_state").InternalStateDispatch;
    extra: import("../internal_state").InternalStateDependencies;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
