import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { type LogDocumentOverview } from '@kbn/discover-utils';
import type { ObservabilityStreamsFeature } from '@kbn/discover-shared-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
interface BadgesProps {
    dataView: DataView;
    hasMessageField: boolean;
    hit: DataTableRecord;
    formattedDoc: LogDocumentOverview;
    renderFlyoutStreamProcessingLink?: ObservabilityStreamsFeature['renderFlyoutStreamProcessingLink'];
    cpsHasLinkedProjects?: boolean;
}
export declare const Badges: ({ dataView, formattedDoc, hit, renderFlyoutStreamProcessingLink, hasMessageField, cpsHasLinkedProjects, }: BadgesProps) => React.JSX.Element | null;
export {};
