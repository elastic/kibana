import React from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { ScrollableSectionWrapperApi } from './scrollable_section_wrapper';
export declare const datasetQualityLinkTitle: string;
export declare const LogsOverviewDegradedFields: React.ForwardRefExoticComponent<{
    rawDoc: DataTableRecord["raw"];
} & React.RefAttributes<ScrollableSectionWrapperApi>>;
