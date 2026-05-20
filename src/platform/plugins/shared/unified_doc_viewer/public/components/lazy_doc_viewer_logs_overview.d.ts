import React from 'react';
import type { LogsOverviewApi } from './doc_viewer_logs_overview/logs_overview';
export declare const UnifiedDocViewerLogsOverview: React.ForwardRefExoticComponent<Omit<Omit<import("@kbn/unified-doc-viewer/types").DocViewRenderProps & import("@kbn/restorable-state").RestorableStateProviderProps<import("./observability/traces/components/trace_waterfall").TraceWaterfallRestorableState> & {
    renderAIAssistant?: import("../../../discover_shared/public").ObservabilityLogsAIAssistantFeature["render"];
    renderAIInsight?: import("../../../discover_shared/public").ObservabilityLogsAIInsightFeature["render"];
    renderFlyoutStreamField?: import("../../../discover_shared/public").ObservabilityStreamsFeature["renderFlyoutStreamField"];
    renderFlyoutStreamProcessingLink?: import("../../../discover_shared/public").ObservabilityStreamsFeature["renderFlyoutStreamProcessingLink"];
    renderCpsWarning?: boolean;
    indexes: import("@kbn/discover-utils/src").ObservabilityIndexes;
    showTraceWaterfall?: boolean;
    docViewActions?: import("@kbn/unified-doc-viewer/types").DocViewActions;
    profileId: string;
} & React.RefAttributes<LogsOverviewApi>, "ref"> & {
    ref?: ((instance: LogsOverviewApi | null) => void | React.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES[keyof React.DO_NOT_USE_OR_YOU_WILL_BE_FIRED_CALLBACK_REF_RETURN_VALUES]) | React.RefObject<LogsOverviewApi> | null | undefined;
}, "ref"> & React.RefAttributes<LogsOverviewApi>>;
