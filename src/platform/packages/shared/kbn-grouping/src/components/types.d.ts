import type { Filter } from '@kbn/es-query';
export interface GenericBuckets {
    key: string | string[];
    key_as_string?: string;
    doc_count: number;
}
export declare const NONE_GROUP_KEY = "none";
export type RawBucket<T> = GenericBuckets & T;
export type GroupingBucket<T> = RawBucket<T> & {
    key: string[];
    key_as_string: string;
    selectedGroup: string;
    isNullGroup?: boolean;
};
/** Defines the shape of the aggregation returned by Elasticsearch */
export interface RootAggregation<T> {
    groupByFields?: {
        buckets?: Array<RawBucket<T>>;
    };
    groupsCount?: {
        value?: number | null;
    };
    unitsCount?: {
        value?: number | null;
    };
    unitsCountWithoutNull?: {
        value?: number | null;
    };
    nullGroupItems?: {
        doc_count?: number;
    };
}
export type ParsedRootAggregation<T> = RootAggregation<T> & {
    groupByFields?: {
        buckets?: Array<GroupingBucket<T>>;
    };
};
export type GroupingFieldTotalAggregation<T> = Record<string, {
    value?: number | null;
    buckets?: Array<RawBucket<T>>;
}>;
export type GroupingAggregation<T> = RootAggregation<T> & GroupingFieldTotalAggregation<T>;
export type ParsedGroupingAggregation<T> = ParsedRootAggregation<T> & GroupingFieldTotalAggregation<T>;
export interface BadgeMetric {
    value: number;
    color?: string;
    width?: number;
}
export interface GroupStatsItem {
    title: string;
    component?: JSX.Element;
    badge?: BadgeMetric;
}
export type GetGroupStats<T> = (selectedGroup: string, fieldBucket: RawBucket<T>) => GroupStatsItem[];
export type GetAdditionalActionButtons<T> = (selectedGroup: string, fieldBucket: RawBucket<T>) => JSX.Element[];
export type GroupPanelRenderer<T> = (selectedGroup: string, fieldBucket: RawBucket<T>, nullGroupMessage?: string, isLoading?: boolean) => JSX.Element | undefined;
export type OnGroupToggle = (params: {
    isOpen: boolean;
    groupName?: string | undefined;
    groupNumber: number;
    groupingId: string;
}) => void;
export type GroupChildComponentRenderer<T> = (groupingFilters: Filter[], selectedGroup?: string, fieldBucket?: RawBucket<T>) => React.ReactElement;
export type { GroupingProps } from './grouping';
