import React from 'react';
import { type DataTableRecord, type LogDocumentOverview } from '@kbn/discover-utils';
import type { ObservabilityStreamsFeature } from '@kbn/discover-shared-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
export declare const ContentBreakdown: ({ dataView, formattedDoc, hit, renderFlyoutStreamProcessingLink, renderCpsWarning, }: {
    dataView: DataView;
    formattedDoc: LogDocumentOverview;
    hit: DataTableRecord;
    renderFlyoutStreamProcessingLink?: ObservabilityStreamsFeature["renderFlyoutStreamProcessingLink"];
    renderCpsWarning?: boolean;
}) => React.JSX.Element;
