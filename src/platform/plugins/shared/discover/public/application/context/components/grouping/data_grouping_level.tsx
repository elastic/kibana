/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactElement } from 'react';
import { memo, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { type GroupingAggregation } from '@kbn/grouping';
import { isNoneGroup } from '@kbn/grouping';
import type { DynamicGroupingProps, ParsedGroupingAggregation } from '@kbn/grouping/src';
import { parseGroupingQuery } from '@kbn/grouping/src';
import type {
  AggregationsAggregate,
  AggregationsLongRareTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/types';
import type { BaseDataGroupAggregations, DataGroupingProps } from './types';
import { useGetDataGroupAggregationsQuery } from './hooks/use_get_alerts_group_aggregations_query';
import { getDataGroupingQuery } from './query_builder';

// ReactElement<any, string | React.JSXElementConstructor<any>>
export interface DataGroupingLevelProps<
  T extends BaseDataGroupAggregations = BaseDataGroupAggregations
> extends DataGroupingProps<T> {
  getGrouping: (
    props: Omit<DynamicGroupingProps<T>, 'groupSelector' | 'pagination'>
  ) => ReactElement;
  groupingLevel?: number;
  onGroupClose: () => void;
  pageIndex: number;
  pageSize: number;
  parentGroupingFilter?: Filter[];
  selectedGroup: string;
  setPageIndex: (newIndex: number) => void;
  setPageSize: (newSize: number) => void;
}

const DEFAULT_FILTERS: Filter[] = [];

/**
 * Renders a data grouping level
 */
const typedMemo: <T>(c: T) => T = memo;
export const DataGroupingLevel = typedMemo(
  <T extends BaseDataGroupAggregations>({
    stateContainer,
    getGrouping,
    groupingLevel,
    loading = false,
    onGroupClose,
    pageIndex,
    pageSize,
    parentGroupingFilter,
    children,
    selectedGroup,
    setPageIndex,
    setPageSize,
    takeActionItems,
    dataView,
    defaultFilters = DEFAULT_FILTERS,
    services: { data, notifications },
  }: DataGroupingLevelProps<T>) => {
    const globalState = stateContainer.globalState.get();
    const globalFilters = globalState?.filters;
    const to = globalState?.time?.to;
    const from = globalState?.time?.from;
    const globalQuery = globalState?.query;

    console.log('global query:: %o \n', globalQuery);

    const filters = useMemo(() => {
      try {
        return [
          buildEsQuery(undefined, globalQuery != null ? [globalQuery] : [], [
            ...(globalFilters?.filter((f) => f.meta.disabled === false) ?? []),
            ...(defaultFilters ?? []),
            ...(parentGroupingFilter ?? []),
          ]),
        ];
      } catch (e) {
        return [];
      }
    }, [defaultFilters, globalFilters, globalQuery, parentGroupingFilter]);

    // Create a unique, but stable (across re-renders) value
    const uniqueValue = useMemo(() => `data-grouping-level-${uuidv4()}`, []);

    const aggregationsQuery = getDataGroupingQuery({
      additionalFilters: filters,
      from: from ?? '',
      selectedGroup,
      pageIndex,
      uniqueValue,
      pageSize,
      to: to ?? '',
    });

    const { data: result, isLoading: isLoadingGroups } = useGetDataGroupAggregationsQuery<
      GroupingAggregation<T>
    >({
      data,
      aggregationsQuery,
      dataView,
      toasts: notifications.toasts,
      enabled: aggregationsQuery && !isNoneGroup([selectedGroup]),
    });

    const queriedGroup = useMemo<string | null>(
      () => (!isNoneGroup([selectedGroup]) ? selectedGroup : null),
      [selectedGroup]
    );

    const aggs = useMemo(
      // queriedGroup because `selectedGroup` updates before the query response
      () =>
        parseGroupingQuery(
          // fallback to selectedGroup if queriedGroup.current is null, this happens in tests
          queriedGroup === null ? selectedGroup : queriedGroup,
          uniqueValue,
          result?.rawResponse?.aggregations as GroupingAggregation<
            AggregationsLongRareTermsBucketKeys & {
              [property: string]: string | number | AggregationsAggregate;
            }
          >
        ),
      [result?.rawResponse?.aggregations, queriedGroup, selectedGroup, uniqueValue]
    );

    return useMemo(
      () =>
        getGrouping({
          activePage: pageIndex,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: (aggs ?? {}) as ParsedGroupingAggregation<any>,
          groupingLevel,
          isLoading: loading || isLoadingGroups,
          itemsPerPage: pageSize,
          onChangeGroupsItemsPerPage: (size: number) => setPageSize(size),
          onChangeGroupsPage: (index) => setPageIndex(index),
          onGroupClose,
          renderChildComponent: children,
          selectedGroup,
          takeActionItems,
        }),
      [
        getGrouping,
        pageIndex,
        aggs,
        groupingLevel,
        loading,
        isLoadingGroups,
        pageSize,
        onGroupClose,
        children,
        selectedGroup,
        takeActionItems,
        setPageSize,
        setPageIndex,
      ]
    );
  }
);
