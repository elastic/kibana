import type { Filter } from '@kbn/es-query';
import React from 'react';
import type { UiCounterMetricType } from '@kbn/analytics';
import type { ParsedGroupingAggregation, GroupPanelRenderer, GetGroupStats, GetAdditionalActionButtons, GroupChildComponentRenderer } from './types';
import type { GroupingBucket, OnGroupToggle } from './types';
export interface GroupingProps<T> {
    activePage: number;
    data?: ParsedGroupingAggregation<T>;
    groupPanelRenderer?: GroupPanelRenderer<T>;
    groupSelector?: JSX.Element;
    getGroupStats?: GetGroupStats<T>;
    groupingId: string;
    groupingLevel?: number;
    /** Optional array of custom controls to display in the toolbar alongside the group selector */
    additionalToolbarControls?: JSX.Element[];
    isLoading: boolean;
    itemsPerPage: number;
    onChangeGroupsItemsPerPage?: (size: number) => void;
    onChangeGroupsPage?: (index: number) => void;
    onGroupToggle?: OnGroupToggle;
    renderChildComponent: GroupChildComponentRenderer<T>;
    onGroupClose: () => void;
    selectedGroup: string;
    takeActionItems?: (groupFilters: Filter[], groupNumber: number, groupBucket: GroupingBucket<T>, closePopover: () => void) => JSX.Element | undefined;
    tracker?: (type: UiCounterMetricType, event: string | string[], count?: number | undefined) => void;
    unit?: (n: number) => string;
    groupsUnit?: (n: number, parentSelectedGroup: string, hasNullGroup: boolean) => string;
    multiValueFields?: string[];
    /** Optional custom component to render when there are no grouping results */
    emptyGroupingComponent?: React.ReactElement;
    /** Optional function to get additional action buttons to display in group stats before the Take actions button */
    getAdditionalActionButtons?: GetAdditionalActionButtons<T>;
}
declare const GroupingComponent: <T>({ activePage, data, groupPanelRenderer, getGroupStats, groupSelector, groupingId, groupingLevel, additionalToolbarControls, isLoading, itemsPerPage, onChangeGroupsItemsPerPage, onChangeGroupsPage, onGroupClose, onGroupToggle, renderChildComponent, selectedGroup, takeActionItems, tracker, unit, groupsUnit, multiValueFields, emptyGroupingComponent, getAdditionalActionButtons, }: GroupingProps<T>) => React.JSX.Element;
export declare const Grouping: typeof GroupingComponent;
export {};
