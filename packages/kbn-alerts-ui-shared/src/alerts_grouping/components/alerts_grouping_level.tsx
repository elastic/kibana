/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { BoolQuery } from '@kbn/es-query';
import { buildEsQuery } from '@kbn/es-query';
import { getGroupingQuery } from '@kbn/securitysolution-grouping';
import { isNoneGroup } from '@kbn/securitysolution-grouping';
import type { DynamicGroupingProps } from '@kbn/securitysolution-grouping/src';
import { parseGroupingQuery } from '@kbn/securitysolution-grouping/src';
import type { DataView } from '@kbn/data-views-plugin/common';
import { AlertsGroupingAggregation, AlertsGroupingProps } from '../types';
import { useFindAlertsQuery } from '../../common/hooks/use_find_alerts_query';

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

export interface GroupedSubLevelProps extends AlertsGroupingProps {
  getGrouping: (
    props: Omit<DynamicGroupingProps<AlertsGroupingAggregation>, 'groupSelector' | 'pagination'>
  ) => React.ReactElement;
  groupingLevel?: number;
  onGroupClose: () => void;
  pageIndex: number;
  pageSize: number;
  parentGroupingFilter?: string;
  // TODO(umbopepato) re-enable?
  // runtimeMappings: RunTimeMappings;
  selectedGroup: string;
  setPageIndex: (newIndex: number) => void;
  setPageSize: (newSize: number) => void;
  dataView: DataView;
}

/**
 * Renders an alerts grouping level
 */
export const AlertsGroupingLevel = memo(
  ({
    defaultFilters = [],
    from,
    getGrouping,
    globalFilters,
    globalQuery,
    groupingLevel,
    loading,
    onGroupClose,
    pageIndex,
    pageSize,
    parentGroupingFilter,
    renderChildComponent,
    selectedGroup,
    setPageIndex,
    setPageSize,
    to,
    dataView,
    getAggregationsByGroupingField,
    services: { http, notifications },
  }: GroupedSubLevelProps) => {
    const { title: indexPattern } = dataView;

    const additionalFilters = useMemo(() => {
      try {
        return [
          buildEsQuery(undefined, globalQuery != null ? [globalQuery] : [], [
            ...(globalFilters?.filter((f) => f.meta.disabled === false) ?? []),
            ...(defaultFilters ?? []),
            ...(parentGroupingFilter ? JSON.parse(parentGroupingFilter) : []),
          ]),
        ];
      } catch (e) {
        return [];
      }
    }, [defaultFilters, globalFilters, globalQuery, parentGroupingFilter]);

    // Create a unique, but stable (across re-renders) value
    const uniqueValue = useMemo(() => `SuperUniqueValue-${uuidv4()}`, []);

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

    const [finalQuery, setFinalQuery] = useState(queryGroups);

    const { data: alertGroupsData, isLoading: isLoadingGroups } = useFindAlertsQuery({
      http,
      toasts: notifications.toasts,
      enabled: finalQuery && !isNoneGroup([selectedGroup]),
      params: {
        index: indexPattern,
        ...finalQuery,
      },
    });

    // TODO re-enable?
    // const emptyGlobalQuery = useMemo(() => getGlobalQuery([]), [getGlobalQuery]);

    // useInvalidFilterQuery({
    //   id: tableId,
    //   filterQuery: emptyGlobalQuery?.filterQuery,
    //   kqlError: emptyGlobalQuery?.kqlError,
    //   query: globalQuery,
    //   startDate: from,
    //   endDate: to,
    // });

    const queriedGroup = useRef<string | null>(null);

    const aggs = useMemo(
      // queriedGroup because `selectedGroup` updates before the query response
      () =>
        parseGroupingQuery(
          // fallback to selectedGroup if queriedGroup.current is null, this happens in tests
          queriedGroup.current === null ? selectedGroup : queriedGroup.current,
          uniqueValue,
          alertGroupsData?.aggregations
        ),
      [alertGroupsData?.aggregations, selectedGroup, uniqueValue]
    );

    useEffect(() => {
      if (!isNoneGroup([selectedGroup])) {
        queriedGroup.current =
          queryGroups?.runtime_mappings?.groupByField?.script?.params?.selectedGroup ?? '';
        setFinalQuery(queryGroups);
      }
    }, [queryGroups, selectedGroup]);

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
          renderChildComponent,
          selectedGroup,
          takeActionItems: () => [<></>], // getTakeActionItems,
        }),
      [
        aggs,
        getGrouping,
        groupingLevel,
        isLoadingGroups,
        loading,
        onGroupClose,
        pageIndex,
        pageSize,
        renderChildComponent,
        selectedGroup,
        setPageIndex,
        setPageSize,
      ]
    );
  }
);
