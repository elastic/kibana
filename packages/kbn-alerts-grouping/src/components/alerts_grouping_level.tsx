/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { memo, ReactElement, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { BoolQuery, Filter } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getGroupingQuery, type GroupingAggregation } from '@kbn/grouping';
import { isNoneGroup } from '@kbn/grouping';
import type { DynamicGroupingProps } from '@kbn/grouping/src';
import { parseGroupingQuery } from '@kbn/grouping/src';
import { useFindAlertsQuery } from '@kbn/alerts-ui-shared';
import { AlertsGroupingProps } from '../types';

interface AlertsGroupingQueryParams {
  additionalFilters: Array<{
    bool: BoolQuery;
  }>;
  from: string;
  pageIndex: number;
  pageSize: number;
  selectedGroup: string;
  uniqueValue: string;
  to: string;
  getAggregationsByGroupingField: AlertsGroupingProps['getAggregationsByGroupingField'];
}

export const getAlertsGroupingQuery = ({
  additionalFilters,
  from,
  pageIndex,
  pageSize,
  selectedGroup,
  uniqueValue,
  to,
  getAggregationsByGroupingField,
}: AlertsGroupingQueryParams) =>
  getGroupingQuery({
    additionalFilters,
    from,
    groupByField: selectedGroup,
    statsAggregations: !isNoneGroup([selectedGroup])
      ? getAggregationsByGroupingField(selectedGroup)
      : [],
    pageNumber: pageIndex * pageSize,
    uniqueValue,
    size: pageSize,
    sort: [{ unitsCount: { order: 'desc' } }],
    to,
  });

export interface AlertsGroupingLevelProps<T extends Record<string, unknown> = {}>
  extends AlertsGroupingProps<T> {
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
 * Renders an alerts grouping level
 */
export const AlertsGroupingLevel = memo(
  <T extends Record<string, unknown> = {}>({
    featureIds,
    defaultFilters = DEFAULT_FILTERS,
    from,
    getGrouping,
    globalFilters,
    globalQuery,
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
    to,
    takeActionItems,
    getAggregationsByGroupingField,
    services: { http, notifications },
  }: AlertsGroupingLevelProps<T>) => {
    const additionalFilters = useMemo(() => {
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
    const uniqueValue = useMemo(() => `alerts-grouping-level-${uuidv4()}`, []);

    const queryGroups = useMemo(() => {
      return getAlertsGroupingQuery({
        additionalFilters,
        selectedGroup,
        uniqueValue,
        from,
        to,
        pageSize,
        pageIndex,
        getAggregationsByGroupingField,
      });
    }, [
      additionalFilters,
      from,
      getAggregationsByGroupingField,
      pageIndex,
      pageSize,
      selectedGroup,
      to,
      uniqueValue,
    ]);

    const { data: alertGroupsData, isLoading: isLoadingGroups } = useFindAlertsQuery<
      GroupingAggregation<T>
    >({
      http,
      toasts: notifications.toasts,
      enabled: queryGroups && !isNoneGroup([selectedGroup]),
      params: {
        feature_ids: featureIds,
        ...queryGroups,
      },
    });

    const queriedGroup = useMemo<string | null>(
      () =>
        !isNoneGroup([selectedGroup])
          ? queryGroups?.runtime_mappings?.groupByField?.script?.params?.selectedGroup
          : null,
      [queryGroups?.runtime_mappings?.groupByField?.script?.params?.selectedGroup, selectedGroup]
    );

    const aggs = useMemo(
      // queriedGroup because `selectedGroup` updates before the query response
      () =>
        parseGroupingQuery(
          // fallback to selectedGroup if queriedGroup.current is null, this happens in tests
          queriedGroup === null ? selectedGroup : queriedGroup,
          uniqueValue,
          alertGroupsData?.aggregations
        ),
      [alertGroupsData?.aggregations, queriedGroup, selectedGroup, uniqueValue]
    );

    return useMemo(
      () =>
        getGrouping({
          activePage: pageIndex,
          data: aggs,
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
