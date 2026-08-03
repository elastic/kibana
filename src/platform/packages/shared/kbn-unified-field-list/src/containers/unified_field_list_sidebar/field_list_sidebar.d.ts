import React from 'react';
import { DataViewField } from '@kbn/data-views-plugin/common';
import type { ButtonAddFieldVariant, AdditionalFieldGroups } from '../../types';
import type { GroupedFieldsParams } from '../../hooks/use_grouped_fields';
import { type UnifiedFieldListItemProps } from '../unified_field_list_item';
import { type SidebarToggleButtonProps } from './sidebar_toggle_button';
export type UnifiedFieldListSidebarCustomizableProps = Pick<UnifiedFieldListItemProps, 'services' | 'workspaceSelectedFieldNames' | 'dataView' | 'trackUiMetric' | 'onAddFilter' | 'onAddBreakdownField' | 'onAddFieldToWorkspace' | 'onRemoveFieldFromWorkspace' | 'additionalFilters' | 'streamNames'> & {
    /**
     * All fields: fields from data view and unmapped fields or columns from text-based search
     */
    allFields: DataViewField[] | null;
    /**
     * Whether to render the field list or not (we don't show it unless documents are loaded)
     */
    showFieldList?: boolean;
    /**
     * Make the field list full width
     */
    fullWidth?: boolean;
    /**
     * Compressed view
     */
    compressed?: boolean;
    /**
     * Custom logic for determining which field is selected
     */
    onSelectedFieldFilter?: GroupedFieldsParams<DataViewField>['onSelectedFieldFilter'];
    /**
     * Prop to pass additional field groups to the field list
     */
    additionalFieldGroups?: AdditionalFieldGroups;
};
interface UnifiedFieldListSidebarInternalProps {
    /**
     * Current search mode based on current query
     */
    searchMode: UnifiedFieldListItemProps['searchMode'];
    /**
     * Service for managing the state
     */
    stateService: UnifiedFieldListItemProps['stateService'];
    /**
     * Show loading instead of the field list if processing
     */
    isProcessing: boolean;
    /**
     * Whether filters are applied
     */
    isAffectedByGlobalFilter: boolean;
    /**
     * Custom element to render at the top
     */
    prepend?: React.ReactNode;
    /**
     * Whether to make action buttons visible
     */
    alwaysShowActionButton?: UnifiedFieldListItemProps['alwaysShowActionButton'];
    /**
     * What button style type to use
     */
    buttonAddFieldVariant: ButtonAddFieldVariant;
    /**
     * In case if sidebar is collapsible by default
     * Pass `undefined` to hide the collapse/expand buttons from the sidebar
     */
    isSidebarCollapsed?: boolean;
    /**
     * A handler to toggle the sidebar
     */
    onToggleSidebar?: SidebarToggleButtonProps['onChange'];
    /**
     * Trigger a field editing
     */
    onEditField: UnifiedFieldListItemProps['onEditField'] | undefined;
    /**
     * Trigger a field deletion
     */
    onDeleteField: UnifiedFieldListItemProps['onDeleteField'] | undefined;
}
export type UnifiedFieldListSidebarProps = UnifiedFieldListSidebarCustomizableProps & UnifiedFieldListSidebarInternalProps;
export declare const UnifiedFieldListSidebarComponent: React.FC<UnifiedFieldListSidebarProps>;
export declare const UnifiedFieldListSidebar: React.NamedExoticComponent<UnifiedFieldListSidebarProps>;
export default UnifiedFieldListSidebar;
