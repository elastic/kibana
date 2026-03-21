import type { DataViewField, FieldSpec } from '@kbn/data-views-plugin/common';
import type { EuiButtonIconProps, EuiButtonProps } from '@elastic/eui';
import type { FieldTypeKnown, FieldBase } from '@kbn/field-utils/types';
export interface BucketedAggregation<KeyType = string> {
    buckets: Array<{
        key: KeyType;
        count: number;
    }>;
    areExamples?: boolean;
}
export interface NumberSummary {
    minValue: number | null;
    maxValue: number | null;
}
export interface FieldStatsResponse<KeyType = unknown> {
    totalDocuments?: number;
    sampledDocuments?: number;
    sampledValues?: number;
    histogram?: BucketedAggregation<KeyType>;
    topValues?: BucketedAggregation<KeyType>;
    numberSummary?: NumberSummary;
}
export type AddFieldFilterHandler = (field: DataViewField | '_exists_', value: unknown, type: '+' | '-') => void;
export declare enum ExistenceFetchStatus {
    failed = "failed",
    succeeded = "succeeded",
    unknown = "unknown"
}
export type FieldListItem = FieldBase;
export declare enum FieldsGroupNames {
    SpecialFields = "SpecialFields",
    SelectedFields = "SelectedFields",
    PopularFields = "PopularFields",
    AvailableFields = "AvailableFields",
    EmptyFields = "EmptyFields",
    MetaFields = "MetaFields",
    UnmappedFields = "UnmappedFields",
    RecommendedFields = "RecommendedFields"
}
export interface FieldsGroupDetails {
    showInAccordion: boolean;
    isInitiallyOpen: boolean;
    title: string;
    helpText?: string;
    isAffectedByGlobalFilter: boolean;
    isAffectedByTimeFilter: boolean;
    hideDetails?: boolean;
    defaultNoFieldsMessage?: string;
    hideIfEmpty?: boolean;
}
export interface FieldsGroup<T extends FieldListItem> extends FieldsGroupDetails {
    fields: T[];
    fieldCount: number;
    fieldSearchHighlight?: string;
}
export type FieldListGroups<T extends FieldListItem> = {
    [key in FieldsGroupNames]?: FieldsGroup<T>;
};
export interface AdditionalFieldGroups {
    recommendedFields?: Array<DataViewField['name']>;
}
export type GetCustomFieldType<T extends FieldListItem> = (field: T) => FieldTypeKnown;
export interface RenderFieldItemParams<T extends FieldListItem> {
    field: T;
    hideDetails?: boolean;
    itemIndex: number;
    groupIndex: number;
    groupName: FieldsGroupNames;
    fieldSearchHighlight?: string;
}
export type OverrideFieldGroupDetails = (groupName: FieldsGroupNames) => Partial<FieldsGroupDetails> | undefined | null;
export interface ExistingFieldsInfo {
    fetchStatus: ExistenceFetchStatus;
    existingFieldsByFieldNameMap: Record<string, boolean>;
    newFields?: FieldSpec[];
    numberOfFetches: number;
    hasDataViewRestrictions?: boolean;
}
export interface FetchedExistingFieldsInfo {
    dataViewId: string;
    dataViewHash: string;
    info: ExistingFieldsInfo;
}
export type TimeRangeUpdatesType = 'search-session' | 'timefilter';
export type ButtonAddFieldVariant = 'primary' | 'toolbar';
export type SearchMode = 'documents' | 'text-based';
export interface UnifiedFieldListSidebarContainerCreationOptions {
    /**
     * Plugin ID
     */
    originatingApp: string;
    /**
     * Pass `true` to enable the compressed view
     */
    compressed?: boolean;
    /**
     * Your app name: "discover", "lens", etc. If not provided, sections and sidebar toggle states would not be persisted.
     */
    localStorageKeyPrefix?: string;
    /**
     * Pass `timefilter` only if you are not using search sessions for the global search
     */
    timeRangeUpdatesType?: TimeRangeUpdatesType;
    /**
     * Choose how the bottom "Add a field" button should look like. Default `primary`.
     */
    buttonAddFieldVariant?: ButtonAddFieldVariant;
    /**
     * Pass `true` to make the sidebar collapsible. Additionally, define `localStorageKeyPrefix` to persist toggle state.
     */
    showSidebarToggleButton?: boolean;
    /**
     * Pass `true` to skip auto fetching of fields existence info
     */
    disableFieldsExistenceAutoFetching?: boolean;
    /**
     * Pass `true` to see all multi fields flattened in the list. Otherwise, they will show in a field popover.
     */
    disableMultiFieldsGroupingByParent?: boolean;
    /**
     * Pass `true` to not have "Popular Fields" section in the field list
     */
    disablePopularFields?: boolean;
    /**
     * Pass `true` to have non-draggable field list items (like in the mobile flyout)
     */
    disableFieldListItemDragAndDrop?: boolean;
    /**
     * When editing fields, it will create a new ad-hoc data view instead of modifying the existing one.
     */
    shouldKeepAdHocDataViewImmutable?: boolean;
    /**
     * This button will be shown in mobile view
     */
    buttonPropsToTriggerFlyout?: Partial<EuiButtonProps>;
    /**
     * Custom props like `aria-label`
     */
    buttonAddFieldToWorkspaceProps?: Partial<EuiButtonIconProps>;
    /**
     * Custom props like `aria-label`
     */
    buttonRemoveFieldFromWorkspaceProps?: Partial<EuiButtonIconProps>;
    /**
     * Return custom configuration for field list sections
     */
    onOverrideFieldGroupDetails?: OverrideFieldGroupDetails;
    /**
     * Use this predicate to hide certain fields
     * @param field
     */
    onSupportedFieldFilter?: (field: DataViewField) => boolean;
    /**
     * Custom `data-test-subj`. Mostly for preserving legacy values.
     */
    dataTestSubj?: {
        fieldListAddFieldButtonTestSubj?: string;
        fieldListSidebarDataTestSubj?: string;
        fieldListItemStatsDataTestSubj?: string;
        fieldListItemDndDataTestSubjPrefix?: string;
        fieldListItemPopoverDataTestSubj?: string;
        fieldListItemPopoverHeaderDataTestSubjPrefix?: string;
    };
}
/**
 * The service used to manage the state of the container
 */
export interface UnifiedFieldListSidebarContainerStateService {
    creationOptions: UnifiedFieldListSidebarContainerCreationOptions;
}
