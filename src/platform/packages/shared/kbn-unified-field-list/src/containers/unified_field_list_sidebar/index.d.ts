import React from 'react';
import type { UnifiedFieldListSidebarContainerProps, UnifiedFieldListSidebarContainerApi } from './field_list_sidebar_container';
export declare const UnifiedFieldListSidebarContainer: React.ForwardRefExoticComponent<Omit<import("./field_list_sidebar").UnifiedFieldListSidebarCustomizableProps, "services"> & {
    services: import("./field_list_sidebar").UnifiedFieldListSidebarCustomizableProps["services"] & {
        dataViewFieldEditor?: import("@kbn/data-view-field-editor-plugin/public").IndexPatternFieldEditorStart;
    };
    getCreationOptions: () => import("../../types").UnifiedFieldListSidebarContainerCreationOptions;
    prependInFlyout?: (() => import("./field_list_sidebar").UnifiedFieldListSidebarProps["prepend"]) | undefined;
    variant?: "responsive" | "button-and-flyout-always" | "list-always";
    onSelectedFieldFilter?: import("./field_list_sidebar").UnifiedFieldListSidebarProps["onSelectedFieldFilter"];
    onFieldEdited?: (options: {
        editedDataView: UnifiedFieldListSidebarContainerProps["dataView"];
        removedFieldName?: string;
        editedFieldName?: string;
    }) => Promise<void>;
    initialState?: Partial<import("../../restorable_state").UnifiedFieldListRestorableState> | undefined;
    onInitialStateChange?: ((initialState: Partial<import("../../restorable_state").UnifiedFieldListRestorableState>) => void) | undefined;
    initialExistingFieldsInfo?: import("../../..").ExistingFieldsFetcherParams["initialExistingFieldsInfo"];
    onInitialExistingFieldsInfoChange?: import("../../..").ExistingFieldsFetcherParams["onInitialExistingFieldsInfoChange"];
} & import("@kbn/shared-ux-utility").WithSuspenseExtendedDeps & React.RefAttributes<UnifiedFieldListSidebarContainerApi>>;
export type { UnifiedFieldListSidebarContainerProps, UnifiedFieldListSidebarContainerApi };
