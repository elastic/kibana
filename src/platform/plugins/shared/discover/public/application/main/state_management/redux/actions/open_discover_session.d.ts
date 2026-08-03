export declare const openDiscoverSession: import("redux-toolkit-v1").AsyncThunk<void, {
    discoverSessionId: string;
}, {
    state: import("..").DiscoverInternalState;
    dispatch: import("..").InternalStateDispatch;
    extra: import("..").InternalStateDependencies;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
