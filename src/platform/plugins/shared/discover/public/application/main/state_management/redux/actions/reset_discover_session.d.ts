import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
export declare const resetDiscoverSession: import("redux-toolkit-v1").AsyncThunk<void, {
    updatedDiscoverSession?: DiscoverSession;
    nextSelectedTabId?: string;
} | undefined, {
    state: import("..").DiscoverInternalState;
    dispatch: import("..").InternalStateDispatch;
    extra: import("..").InternalStateDependencies;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
