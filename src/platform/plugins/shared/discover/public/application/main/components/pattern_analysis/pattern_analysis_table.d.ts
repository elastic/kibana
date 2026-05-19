import React from 'react';
import type { UiCounterMetricType } from '@kbn/analytics';
import { type EmbeddablePatternAnalysisInput } from '@kbn/aiops-log-pattern-analysis/embeddable';
export type PatternAnalysisTableProps = EmbeddablePatternAnalysisInput & {
    trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
    renderViewModeToggle: (patternCount?: number) => React.ReactElement;
};
export declare const PatternAnalysisTable: (props: PatternAnalysisTableProps) => React.JSX.Element | null;
