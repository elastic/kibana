import type { DataTableRecord } from '@kbn/discover-utils';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { ScrollableSectionWrapperApi } from './scrollable_section_wrapper';
export declare const LogsOverviewStacktraceSection: React.ForwardRefExoticComponent<{
    hit: DataTableRecord;
    dataView: DataView;
} & React.RefAttributes<ScrollableSectionWrapperApi>>;
