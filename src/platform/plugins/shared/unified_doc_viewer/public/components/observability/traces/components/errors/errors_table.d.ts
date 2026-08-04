import React from 'react';
import { type ScrollableSectionWrapperApi } from '../../../../doc_viewer_logs_overview/scrollable_section_wrapper';
export interface Props {
    traceId: string;
    docId?: string;
}
export declare const ErrorsTable: React.ForwardRefExoticComponent<Props & React.RefAttributes<ScrollableSectionWrapperApi>>;
