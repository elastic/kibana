import React from 'react';
export declare const UnifiedDocViewerObservabilityTracesOverview: React.ForwardRefExoticComponent<Omit<Omit<import("@kbn/unified-doc-viewer/types").DocViewRenderProps & import("@kbn/restorable-state").RestorableStateProviderProps<import("../components/trace_waterfall").TraceWaterfallRestorableState> & {
    indexes: import("@kbn/discover-utils/src").ObservabilityIndexes;
    profileId: string;
    showWaterfall?: boolean;
    showActions?: boolean;
    docViewActions?: import("@kbn/unified-doc-viewer/types").DocViewActions;
} & React.RefAttributes<import("./overview").OverviewApi>, "ref"> & {
    ref?: ((instance: import("./overview").OverviewApi | null) => void | React.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof React.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) | React.RefObject<import("./overview").OverviewApi> | null | undefined;
}, "ref"> & React.RefAttributes<{}>>;
