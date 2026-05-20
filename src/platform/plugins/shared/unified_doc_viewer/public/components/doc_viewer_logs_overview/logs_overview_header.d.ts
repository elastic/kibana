import React from 'react';
import type { LogDocumentOverview } from '@kbn/discover-utils';
import type { ObservabilityStreamsFeature } from '@kbn/discover-shared-plugin/public';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
export declare const contentLabel: string;
interface LogsOverviewHeaderProps extends Pick<DocViewRenderProps, 'filter' | 'onAddColumn' | 'onRemoveColumn' | 'hit' | 'dataView'> {
    formattedDoc: LogDocumentOverview;
    renderFlyoutStreamProcessingLink?: ObservabilityStreamsFeature['renderFlyoutStreamProcessingLink'];
    renderCpsWarning?: boolean;
}
export declare function LogsOverviewHeader({ hit, formattedDoc, dataView, filter, onAddColumn, onRemoveColumn, renderFlyoutStreamProcessingLink, renderCpsWarning, }: LogsOverviewHeaderProps): React.JSX.Element;
export {};
