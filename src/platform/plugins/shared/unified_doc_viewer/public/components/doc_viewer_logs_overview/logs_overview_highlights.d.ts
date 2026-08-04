import React from 'react';
import type { LogDocumentOverview } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
interface LogsOverviewHighlightsProps extends Pick<DocViewRenderProps, 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'dataView' | 'hit'> {
    formattedDoc: LogDocumentOverview;
}
export declare function LogsOverviewHighlights({ formattedDoc, hit, dataView, filter, onAddColumn, onRemoveColumn, }: LogsOverviewHighlightsProps): React.JSX.Element | null;
export {};
