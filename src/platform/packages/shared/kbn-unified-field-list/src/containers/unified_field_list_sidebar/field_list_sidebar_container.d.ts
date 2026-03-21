import React, { type ComponentProps } from 'react';
import type { IndexPatternFieldEditorStart } from '@kbn/data-view-field-editor-plugin/public';
import { type ExistingFieldsFetcherParams, type ExistingFieldsFetcher } from '../../hooks/use_existing_fields';
import type { SidebarVisibility } from './get_sidebar_visibility';
import { type UnifiedFieldListSidebarCustomizableProps, type UnifiedFieldListSidebarProps } from './field_list_sidebar';
import type { UnifiedFieldListSidebarContainerCreationOptions, UnifiedFieldListSidebarContainerStateService } from '../../types';
interface InternalUnifiedFieldListSidebarContainerProps {
    stateService: UnifiedFieldListSidebarContainerStateService;
    isFieldListFlyoutVisible: boolean;
    setIsFieldListFlyoutVisible: (isVisible: boolean) => void;
    commonSidebarProps: UnifiedFieldListSidebarProps;
    prependInFlyout?: () => UnifiedFieldListSidebarProps['prepend'];
    variant: 'responsive' | 'button-and-flyout-always' | 'list-always';
    workspaceSelectedFieldNames?: UnifiedFieldListSidebarCustomizableProps['workspaceSelectedFieldNames'];
}
declare const UnifiedFieldListSidebarContainerWithRestorableState: React.ForwardRefExoticComponent<InternalUnifiedFieldListSidebarContainerProps & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<import("../../restorable_state").UnifiedFieldListRestorableState>, "initialState" | "onInitialStateChange"> & React.RefAttributes<never>>;
type UnifiedFieldListSidebarContainerPropsWithRestorableState = ComponentProps<typeof UnifiedFieldListSidebarContainerWithRestorableState>;
export interface UnifiedFieldListSidebarContainerApi {
    sidebarVisibility: SidebarVisibility;
    refetchFieldsExistenceInfo: ExistingFieldsFetcher['refetchFieldsExistenceInfo'];
    closeFieldListFlyout: () => void;
    createField: undefined | (() => void);
    editField: undefined | ((fieldName: string) => void);
    deleteField: undefined | ((fieldName: string) => void);
}
export type UnifiedFieldListSidebarContainerProps = Omit<UnifiedFieldListSidebarCustomizableProps, 'services'> & {
    /**
     * Required services.
     */
    services: UnifiedFieldListSidebarCustomizableProps['services'] & {
        dataViewFieldEditor?: IndexPatternFieldEditorStart;
    };
    /**
     * Return static configuration options which don't need to change
     */
    getCreationOptions: () => UnifiedFieldListSidebarContainerCreationOptions;
    /**
     * Custom content to render at the top of field list in the flyout (for example a data view picker)
     */
    prependInFlyout?: InternalUnifiedFieldListSidebarContainerProps['prependInFlyout'];
    /**
     * Customization for responsive behaviour. Default: `responsive`.
     */
    variant?: InternalUnifiedFieldListSidebarContainerProps['variant'];
    /**
     * Custom logic for determining which field is selected. Otherwise, use `workspaceSelectedFieldNames` prop.
     */
    onSelectedFieldFilter?: UnifiedFieldListSidebarProps['onSelectedFieldFilter'];
    /**
     * Callback to execute after editing/deleting a runtime field
     */
    onFieldEdited?: (options: {
        editedDataView: UnifiedFieldListSidebarContainerProps['dataView'];
        removedFieldName?: string;
        editedFieldName?: string;
    }) => Promise<void>;
    initialState?: UnifiedFieldListSidebarContainerPropsWithRestorableState['initialState'];
    onInitialStateChange?: UnifiedFieldListSidebarContainerPropsWithRestorableState['onInitialStateChange'];
    /**
     * Custom container for existing fields info map
     */
    initialExistingFieldsInfo?: ExistingFieldsFetcherParams['initialExistingFieldsInfo'];
    onInitialExistingFieldsInfoChange?: ExistingFieldsFetcherParams['onInitialExistingFieldsInfoChange'];
};
/**
 * Component providing 2 different renderings for the sidebar depending on available screen space
 * Desktop: Sidebar view, all elements are visible
 * Mobile: A button to trigger a flyout with all elements
 */
declare const UnifiedFieldListSidebarContainer: React.ForwardRefExoticComponent<Omit<UnifiedFieldListSidebarCustomizableProps, "services"> & {
    /**
     * Required services.
     */
    services: UnifiedFieldListSidebarCustomizableProps["services"] & {
        dataViewFieldEditor?: IndexPatternFieldEditorStart;
    };
    /**
     * Return static configuration options which don't need to change
     */
    getCreationOptions: () => UnifiedFieldListSidebarContainerCreationOptions;
    /**
     * Custom content to render at the top of field list in the flyout (for example a data view picker)
     */
    prependInFlyout?: InternalUnifiedFieldListSidebarContainerProps["prependInFlyout"];
    /**
     * Customization for responsive behaviour. Default: `responsive`.
     */
    variant?: InternalUnifiedFieldListSidebarContainerProps["variant"];
    /**
     * Custom logic for determining which field is selected. Otherwise, use `workspaceSelectedFieldNames` prop.
     */
    onSelectedFieldFilter?: UnifiedFieldListSidebarProps["onSelectedFieldFilter"];
    /**
     * Callback to execute after editing/deleting a runtime field
     */
    onFieldEdited?: (options: {
        editedDataView: UnifiedFieldListSidebarContainerProps["dataView"];
        removedFieldName?: string;
        editedFieldName?: string;
    }) => Promise<void>;
    initialState?: UnifiedFieldListSidebarContainerPropsWithRestorableState["initialState"];
    onInitialStateChange?: UnifiedFieldListSidebarContainerPropsWithRestorableState["onInitialStateChange"];
    /**
     * Custom container for existing fields info map
     */
    initialExistingFieldsInfo?: ExistingFieldsFetcherParams["initialExistingFieldsInfo"];
    onInitialExistingFieldsInfoChange?: ExistingFieldsFetcherParams["onInitialExistingFieldsInfoChange"];
} & React.RefAttributes<UnifiedFieldListSidebarContainerApi>>;
export default UnifiedFieldListSidebarContainer;
