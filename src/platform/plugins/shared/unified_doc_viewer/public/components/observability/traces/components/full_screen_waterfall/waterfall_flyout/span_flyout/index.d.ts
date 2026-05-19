import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React from 'react';
import { type TraceOverviewSections } from '../../../../doc_viewer_overview/overview';
export { useSpanFlyoutData } from './use_span_flyout_data';
export type { UseSpanFlyoutDataParams, SpanFlyoutData } from './use_span_flyout_data';
export interface SpanFlyoutContentProps {
    hit: DataTableRecord;
    dataView: DocViewRenderProps['dataView'];
    activeSection?: TraceOverviewSections;
}
export declare function SpanFlyoutContent({ hit, dataView, activeSection }: SpanFlyoutContentProps): React.JSX.Element;
