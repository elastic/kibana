import type { ObservabilityIndexes } from '@kbn/discover-utils/src';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import type { DocViewActions } from '@kbn/unified-doc-viewer/src/services/types';
import type { RestorableStateProviderProps } from '@kbn/restorable-state';
import React from 'react';
import { type TraceWaterfallRestorableState } from '../components/trace_waterfall';
export type OverviewProps = DocViewRenderProps & RestorableStateProviderProps<TraceWaterfallRestorableState> & {
    indexes: ObservabilityIndexes;
    profileId: string;
    showWaterfall?: boolean;
    showActions?: boolean;
    docViewActions?: DocViewActions;
};
export type TraceOverviewSections = 'errors-table';
export interface OverviewApi {
    openAndScrollToSection: (section: TraceOverviewSections) => void;
}
export declare const Overview: React.ForwardRefExoticComponent<DocViewRenderProps & RestorableStateProviderProps<TraceWaterfallRestorableState> & {
    indexes: ObservabilityIndexes;
    profileId: string;
    showWaterfall?: boolean;
    showActions?: boolean;
    docViewActions?: DocViewActions;
} & React.RefAttributes<OverviewApi>>;
