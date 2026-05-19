import React from 'react';
import type { UiCounterMetricType } from '@kbn/analytics';
import type { BehaviorSubject } from 'rxjs';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { type UnifiedFieldListSidebarContainerProps } from '@kbn/unified-field-list';
import type { Filter } from '@kbn/es-query';
import type { DataDocuments$ } from '../../state_management/discover_data_state_container';
import type { SidebarToggleState } from '../../../types';
export interface DiscoverSidebarResponsiveProps {
    /**
     * the selected columns displayed in the doc table in discover
     */
    columns: string[];
    /**
     * hits fetched from ES, displayed in the doc table
     */
    documents$: DataDocuments$;
    /**
     * Callback to update breakdown field
     */
    onAddBreakdownField?: (breakdownField: DataViewField | undefined) => void;
    /**
     * Callback function when selecting a field
     */
    onAddField: (fieldName: string) => void;
    /**
     * Callback function when adding a filter from sidebar
     */
    onAddFilter?: (field: DataViewField | string, value: unknown, type: '+' | '-') => void;
    /**
     * Callback function when changing an data view
     */
    onChangeDataView: (id: string) => void;
    /**
     * Callback to remove a field column from the table
     * @param fieldName
     */
    onRemoveField: (fieldName: string) => void;
    /**
     * Currently selected data view
     */
    selectedDataView?: DataView;
    /**
     * Metric tracking function
     * @param metricType
     * @param eventName
     */
    trackUiMetric?: (metricType: UiCounterMetricType, eventName: string | string[]) => void;
    /**
     * callback to execute on edit runtime field
     */
    onFieldEdited: (options: {
        editedDataView: DataView;
        removedFieldName?: string;
    }) => Promise<void>;
    /**
     * callback to execute on create dataview
     */
    onDataViewCreated: (dataView: DataView) => void;
    /**
     * For customization and testing purposes
     */
    fieldListVariant?: UnifiedFieldListSidebarContainerProps['variant'];
    sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
    /**
     * Custom filters to apply for the field list, ex: namespace custom filter
     */
    additionalFilters?: Filter[];
}
/**
 * Component providing 2 different renderings for the sidebar depending on available screen space
 * Desktop: Sidebar view, all elements are visible
 * Mobile: Data view selector is visible and a button to trigger a flyout with all elements
 */
export declare function DiscoverSidebarResponsive(props: DiscoverSidebarResponsiveProps): React.JSX.Element;
