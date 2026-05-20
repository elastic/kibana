import type { FieldSpec } from '@kbn/data-views-plugin/common';
import React from 'react';
import type { UiCounterMetricType } from '@kbn/analytics';
import type { GroupingProps, GroupSelectorProps } from '..';
import type { GroupMap, GroupOption, GroupSettings } from './types';
/** Interface for grouping object where T is the `GroupingAggregation`
 *  @interface GroupingArgs<T>
 */
export interface UseGrouping<T> {
    getGrouping: (props: DynamicGroupingProps<T>) => React.ReactElement;
    groupSelector: React.ReactElement<GroupSelectorProps>;
    selectedGroups: string[];
    setSelectedGroups: (selectedGroups: string[]) => void;
}
/** Type for static grouping component props where T is the consumer `GroupingAggregation`
 *  @interface StaticGroupingProps<T>
 */
type StaticGroupingProps<T> = Pick<GroupingProps<T>, 'groupPanelRenderer' | 'getGroupStats' | 'onGroupToggle' | 'unit' | 'groupsUnit' | 'multiValueFields' | 'emptyGroupingComponent' | 'getAdditionalActionButtons'>;
/** Type for dynamic grouping component props where T is the consumer `GroupingAggregation`
 *  @interface DynamicGroupingProps<T>
 */
export type DynamicGroupingProps<T> = Pick<GroupingProps<T>, 'activePage' | 'data' | 'groupingLevel' | 'additionalToolbarControls' | 'isLoading' | 'itemsPerPage' | 'onChangeGroupsItemsPerPage' | 'onChangeGroupsPage' | 'renderChildComponent' | 'onGroupClose' | 'selectedGroup' | 'takeActionItems'>;
/** Interface for configuring grouping package where T is the consumer `GroupingAggregation`
 *  @interface GroupingArgs<T>
 */
export interface GroupingArgs<T> {
    componentProps: StaticGroupingProps<T>;
    defaultGroupingOptions: GroupOption[];
    fields: FieldSpec[];
    groupingId: string;
    maxGroupingLevels?: number;
    /** for tracking
     * @param param { groupByField: string; tableId: string } selected group and table id
     */
    initialGroupings?: GroupMap;
    onGroupChange?: (param: {
        groupByField: string;
        groupByFields: string[];
        tableId: string;
    }) => void;
    onOptionsChange?: (options: GroupOption[]) => void;
    tracker?: (type: UiCounterMetricType, event: string | string[], count?: number | undefined) => void;
    title?: string;
    onOpenTracker?: (type: UiCounterMetricType, event: string | string[], count?: number | undefined) => void;
    settings?: GroupSettings;
}
/**
 * Hook to configure grouping component
 * @param componentProps {@link StaticGroupingProps} props passed to the grouping component.
 * These props are static compared to the dynamic props passed later to getGrouping
 * @param defaultGroupingOptions defines the grouping options as an array of {@link GroupOption}
 * @param initialGroupings represents the initial groupingState value
 * @param fields FieldSpec array serialized version of DataViewField fields. Available in the custom grouping options
 * @param groupingId Unique identifier of the grouping component. Used in local storage
 * @param maxGroupingLevels maximum group nesting levels (optional)
 * @param onGroupChange callback executed when selected group is changed, used for tracking
 * @param onOptionsChange callback executed when grouping options are changed, used for consumer grouping selector
 * @param tracker telemetry handler
 * @param title of the grouping selector component
 * @returns {@link Grouping} the grouping constructor { getGrouping, groupSelector, pagination, selectedGroups }
 */
export declare const useGrouping: <T>({ componentProps, defaultGroupingOptions, initialGroupings, fields, groupingId, maxGroupingLevels, onGroupChange, onOptionsChange, tracker, title, onOpenTracker, settings, }: GroupingArgs<T>) => UseGrouping<T>;
export {};
