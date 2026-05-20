import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { UiCounterMetricType } from '@kbn/analytics';
import React from 'react';
import type { GroupOption, Action, GroupMap, GroupSettings } from './types';
export interface UseGetGroupSelectorArgs {
    defaultGroupingOptions: GroupOption[];
    dispatch: React.Dispatch<Action>;
    fields: FieldSpec[];
    groupingId: string;
    groupingState: GroupMap;
    maxGroupingLevels?: number;
    onOptionsChange?: (newOptions: GroupOption[]) => void;
    onGroupChange?: (param: {
        groupByField: string;
        groupByFields: string[];
        tableId: string;
    }) => void;
    tracker?: (type: UiCounterMetricType, event: string | string[], count?: number | undefined) => void;
    title?: string;
    onOpenTracker?: (type: UiCounterMetricType, event: string | string[], count?: number | undefined) => void;
    settings?: GroupSettings;
}
interface UseGetGroupSelectorStateless extends Pick<UseGetGroupSelectorArgs, 'defaultGroupingOptions' | 'groupingId' | 'fields' | 'maxGroupingLevels' | 'settings'> {
    onGroupChange: (selectedGroups: string[]) => void;
}
export declare const useGetGroupSelectorStateless: ({ defaultGroupingOptions, groupingId, fields, onGroupChange, maxGroupingLevels, settings, }: UseGetGroupSelectorStateless) => React.JSX.Element;
export declare const useGetGroupSelector: ({ defaultGroupingOptions, dispatch, fields, groupingId, groupingState, maxGroupingLevels, onGroupChange, onOptionsChange, tracker, title, onOpenTracker, settings, }: UseGetGroupSelectorArgs) => React.JSX.Element;
export {};
