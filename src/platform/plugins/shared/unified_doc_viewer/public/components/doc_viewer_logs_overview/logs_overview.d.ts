import React from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { ObservabilityLogsAIAssistantFeature, ObservabilityLogsAIInsightFeature, ObservabilityStreamsFeature } from '@kbn/discover-shared-plugin/public';
import type { ObservabilityIndexes } from '@kbn/discover-utils/src';
import type { DocViewActions } from '@kbn/unified-doc-viewer/src/services/types';
import type { RestorableStateProviderProps } from '@kbn/restorable-state';
import { type TraceWaterfallRestorableState } from '../observability/traces/components/trace_waterfall';
export type LogsOverviewProps = DocViewRenderProps & RestorableStateProviderProps<TraceWaterfallRestorableState> & {
    renderAIAssistant?: ObservabilityLogsAIAssistantFeature['render'];
    renderAIInsight?: ObservabilityLogsAIInsightFeature['render'];
    renderFlyoutStreamField?: ObservabilityStreamsFeature['renderFlyoutStreamField'];
    renderFlyoutStreamProcessingLink?: ObservabilityStreamsFeature['renderFlyoutStreamProcessingLink'];
    renderCpsWarning?: boolean;
    indexes: ObservabilityIndexes;
    showTraceWaterfall?: boolean;
    docViewActions?: DocViewActions;
    profileId: string;
};
export interface LogsOverviewApi {
    openAndScrollToSection: (section: 'stacktrace' | 'quality_issues') => void;
}
export declare const LogsOverview: React.ForwardRefExoticComponent<DocViewRenderProps & RestorableStateProviderProps<TraceWaterfallRestorableState> & {
    renderAIAssistant?: ObservabilityLogsAIAssistantFeature["render"];
    renderAIInsight?: ObservabilityLogsAIInsightFeature["render"];
    renderFlyoutStreamField?: ObservabilityStreamsFeature["renderFlyoutStreamField"];
    renderFlyoutStreamProcessingLink?: ObservabilityStreamsFeature["renderFlyoutStreamProcessingLink"];
    renderCpsWarning?: boolean;
    indexes: ObservabilityIndexes;
    showTraceWaterfall?: boolean;
    docViewActions?: DocViewActions;
    profileId: string;
} & React.RefAttributes<LogsOverviewApi>>;
