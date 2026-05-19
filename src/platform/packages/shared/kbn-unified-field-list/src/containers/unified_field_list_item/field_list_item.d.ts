import React from 'react';
import type { UiCounterMetricType } from '@kbn/analytics';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { SearchMode } from '../../types';
import { type FieldItemButtonProps } from '../../components/field_item_button';
import { type FieldPopoverFooterProps } from '../../components/field_popover';
import { type UnifiedFieldListItemStatsProps } from './field_list_item_stats';
import type { UnifiedFieldListSidebarContainerStateService, AddFieldFilterHandler } from '../../types';
export interface UnifiedFieldListItemProps {
    /**
     * Service for managing the state
     */
    stateService: UnifiedFieldListSidebarContainerStateService;
    /**
     * Required services
     */
    services: UnifiedFieldListItemStatsProps['services'] & {
        uiActions?: FieldPopoverFooterProps['uiActions'];
        fieldsMetadata?: FieldsMetadataPublicStart;
    };
    /**
     * Current search mode
     */
    searchMode: SearchMode | undefined;
    /**
     * Determines whether add/remove button is displayed not only when focused
     */
    alwaysShowActionButton?: boolean;
    /**
     * The displayed field
     */
    field: DataViewField;
    /**
     * The currently selected data view
     */
    dataView: DataView;
    /**
     * Callback to update breakdown field
     */
    onAddBreakdownField?: (breakdownField: DataViewField | undefined) => void;
    /**
     * Callback to add/select the field
     */
    onAddFieldToWorkspace: (field: DataViewField) => void;
    /**
     * Callback to remove a field column from the table
     * @param fieldName
     */
    onRemoveFieldFromWorkspace: (field: DataViewField) => void;
    /**
     * Callback to add a filter to filter bar
     */
    onAddFilter?: AddFieldFilterHandler;
    /**
     * Determines whether the field is empty
     */
    isEmpty: boolean;
    /**
     * Determines whether the field is selected
     */
    isSelected: boolean;
    /**
     * Metric tracking function
     * @param metricType
     * @param eventName
     */
    trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
    /**
     * Multi fields for the current field
     */
    multiFields?: Array<{
        field: DataViewField;
        isSelected: boolean;
    }>;
    /**
     * Callback to edit a field from data view
     * @param fieldName name of the field to edit
     */
    onEditField?: (fieldName?: string) => void;
    /**
     * Callback to delete a runtime field from data view
     * @param fieldName name of the field to delete
     */
    onDeleteField?: (fieldName: string) => void;
    /**
     * Currently selected fields like table columns
     */
    workspaceSelectedFieldNames?: string[];
    /**
     * Search by field name
     */
    highlight?: string;
    /**
     * Group index in the field list
     */
    groupIndex: number;
    /**
     * Item index in the field list
     */
    itemIndex: number;
    /**
     * Item size
     */
    size: FieldItemButtonProps<DataViewField>['size'];
    /**
     * Custom filters to apply for the field list, ex: namespace custom filter
     */
    additionalFilters?: Filter[];
    /**
     * Optional stream name to fetch stream-specific field descriptions
     */
    streamNames?: string[];
}
declare function UnifiedFieldListItemComponent({ stateService, services, searchMode, alwaysShowActionButton, field, highlight, dataView, onAddBreakdownField, onAddFieldToWorkspace, onRemoveFieldFromWorkspace, onAddFilter, isEmpty, isSelected, trackUiMetric, multiFields, onEditField, onDeleteField, workspaceSelectedFieldNames, groupIndex, itemIndex, size, additionalFilters, streamNames, }: UnifiedFieldListItemProps): React.JSX.Element;
export declare const UnifiedFieldListItem: React.MemoExoticComponent<typeof UnifiedFieldListItemComponent>;
export {};
