import React from 'react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { type FieldStatsProps, type FieldStatsServices } from '../../components/field_stats';
import type { UnifiedFieldListSidebarContainerStateService } from '../../types';
export interface UnifiedFieldListItemStatsProps {
    stateService: UnifiedFieldListSidebarContainerStateService;
    field: DataViewField;
    services: Omit<FieldStatsServices, 'uiSettings'> & {
        core: CoreStart;
    };
    dataView: DataView;
    multiFields?: Array<{
        field: DataViewField;
        isSelected: boolean;
    }>;
    onAddFilter: FieldStatsProps['onAddFilter'];
    additionalFilters?: FieldStatsProps['filters'];
}
export declare const UnifiedFieldListItemStats: React.FC<UnifiedFieldListItemStatsProps>;
export declare const getFieldForStats: (field: DataViewField, multiFields: Array<{
    field: DataViewField;
    isSelected: boolean;
}> | undefined) => DataViewField;
