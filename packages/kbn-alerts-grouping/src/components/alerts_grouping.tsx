/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  Dispatch,
  memo,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Filter } from '@kbn/es-query';
import { isNoneGroup, useGrouping } from '@kbn/grouping';
import { isEqual } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import { useAlertsDataView } from '@kbn/alerts-ui-shared/src/common/hooks/use_alerts_data_view';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { AlertsGroupingLevel, AlertsGroupingLevelProps } from './alerts_grouping_level';
import type { AlertsGroupingProps, BaseAlertsGroupAggregations } from '../types';
import {
  AlertsGroupingContextProvider,
  useAlertsGroupingState,
} from '../contexts/alerts_grouping_context';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, MAX_GROUPING_LEVELS } from '../constants';

/**
 * Handles recursive rendering of grouping levels
 */
const NextLevel = ({
  level,
  selectedGroups,
  children,
  parentGroupingFilter,
  groupingFilters,
  getLevel,
}: Pick<
  AlertsGroupingLevelProps<BaseAlertsGroupAggregations>,
  'children' | 'parentGroupingFilter'
> & {
  level: number;
  selectedGroups: string[];
  groupingFilters: Filter[];
  getLevel: (level: number, selectedGroup: string, parentGroupingFilter?: Filter[]) => JSX.Element;
}): JSX.Element => {
  const nextGroupingFilters = useMemo(
    () => [...groupingFilters, ...(parentGroupingFilter ?? [])],
    [groupingFilters, parentGroupingFilter]
  );
  if (level < selectedGroups.length - 1) {
    return getLevel(level + 1, selectedGroups[level + 1], nextGroupingFilters)!;
  }
  return children(nextGroupingFilters)!;
};

const AlertsGroupingInternal = <T extends BaseAlertsGroupAggregations>(
  props: AlertsGroupingProps<T>
) => {
  const {
    groupingId,
    services,
    featureIds,
    defaultGroupingOptions,
    defaultFilters,
    globalFilters,
    globalQuery,
    renderGroupPanel,
    getGroupStats,
    children,
  } = props;
  const { dataViews, notifications, http } = services;
  const { grouping, updateGrouping } = useAlertsGroupingState(groupingId);

  const { dataView } = useAlertsDataView({
    featureIds,
    dataViewsService: dataViews,
    http,
    toasts: notifications.toasts,
  });
  const [pageSize, setPageSize] = useLocalStorage<number[]>(
    `grouping-table-${groupingId}`,
    Array(MAX_GROUPING_LEVELS).fill(DEFAULT_PAGE_SIZE)
  ) as [number[], Dispatch<SetStateAction<number[]>>, () => void];

  const onOptionsChange = useCallback(
    (options) => {
      // useGrouping > useAlertsGroupingState options sync
      // the available grouping options change when the user selects
      // a new field not in the default ones
      updateGrouping({
        options,
      });
    },
    [updateGrouping]
  );

  const { getGrouping, selectedGroups, setSelectedGroups } = useGrouping({
    componentProps: {
      groupPanelRenderer: renderGroupPanel,
      getGroupStats,
      unit: (totalCount) =>
        i18n.translate('alertsGrouping.unit', {
          values: { totalCount },
          defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
        }),
    },
    defaultGroupingOptions,
    fields: dataView?.fields ?? [],
    groupingId,
    maxGroupingLevels: MAX_GROUPING_LEVELS,
    onOptionsChange,
  });

  useEffect(() => {
    // The `none` grouping is managed from the internal selector state
    if (isNoneGroup(selectedGroups)) {
      // Set active groups from selected groups
      updateGrouping({
        activeGroups: selectedGroups,
      });
    }
  }, [selectedGroups, updateGrouping]);

  useEffect(() => {
    if (!isNoneGroup(grouping.activeGroups)) {
      // Set selected groups from active groups
      setSelectedGroups(grouping.activeGroups);
    }
  }, [grouping.activeGroups, setSelectedGroups]);

  const [pageIndex, setPageIndex] = useState<number[]>(
    Array(MAX_GROUPING_LEVELS).fill(DEFAULT_PAGE_INDEX)
  );

  const resetAllPagination = useCallback(() => {
    setPageIndex((curr) => curr.map(() => DEFAULT_PAGE_INDEX));
  }, []);

  const setPageVar = useCallback(
    (newNumber: number, groupingLevel: number, pageType: 'index' | 'size') => {
      if (pageType === 'index') {
        setPageIndex((currentIndex) => {
          const newArr = [...currentIndex];
          newArr[groupingLevel] = newNumber;
          return newArr;
        });
      }

      if (pageType === 'size') {
        setPageSize((currentIndex) => {
          const newArr = [...currentIndex];
          newArr[groupingLevel] = newNumber;
          return newArr;
        });
        // set page index to 0 when page size is changed
        setPageIndex((currentIndex) => {
          const newArr = [...currentIndex];
          newArr[groupingLevel] = 0;
          return newArr;
        });
      }
    },
    [setPageSize]
  );

  const paginationResetTriggers = useRef({
    defaultFilters,
    globalFilters,
    globalQuery,
    selectedGroups,
  });

  useEffect(() => {
    const triggers = {
      defaultFilters,
      globalFilters,
      globalQuery,
      selectedGroups,
    };
    if (!isEqual(paginationResetTriggers.current, triggers)) {
      resetAllPagination();
      paginationResetTriggers.current = triggers;
    }
  }, [defaultFilters, globalFilters, globalQuery, resetAllPagination, selectedGroups]);

  const getLevel = useCallback(
    (level: number, selectedGroup: string, parentGroupingFilter?: Filter[]) => {
      const resetGroupChildrenPagination = (parentLevel: number) => {
        setPageIndex((allPages) => {
          const resetPages = allPages.splice(parentLevel + 1, allPages.length);
          return [...allPages, ...resetPages.map(() => DEFAULT_PAGE_INDEX)];
        });
      };

      return (
        <AlertsGroupingLevel<T>
          {...props}
          getGrouping={getGrouping}
          groupingLevel={level}
          onGroupClose={() => resetGroupChildrenPagination(level)}
          pageIndex={pageIndex[level] ?? DEFAULT_PAGE_INDEX}
          pageSize={pageSize[level] ?? DEFAULT_PAGE_SIZE}
          parentGroupingFilter={parentGroupingFilter}
          selectedGroup={selectedGroup}
          setPageIndex={(newIndex: number) => setPageVar(newIndex, level, 'index')}
          setPageSize={(newSize: number) => setPageVar(newSize, level, 'size')}
        >
          {(groupingFilters) => (
            <NextLevel
              selectedGroups={selectedGroups}
              groupingFilters={groupingFilters}
              getLevel={getLevel}
              parentGroupingFilter={parentGroupingFilter}
              level={level}
            >
              {children}
            </NextLevel>
          )}
        </AlertsGroupingLevel>
      );
    },
    [children, getGrouping, pageIndex, pageSize, props, selectedGroups, setPageVar]
  );

  if (!dataView) {
    return null;
  }

  return getLevel(0, selectedGroups[0]);
};

const typedMemo: <T>(c: T) => T = memo;

/**
 * A coordinator component to show multiple alert tables grouped by one or more fields
 *
 * @example Basic grouping
 * ```ts
 * const {
 *   notifications,
 *   dataViews,
 *   http,
 * } = useKibana().services;
 *
 *
 * return (
 *   <AlertsGrouping<YourAggregationsType>
 *     featureIds={[...]}
 *     globalQuery={{ query: ..., language: 'kql' }}
 *     globalFilters={...}
 *     from={...}
 *     to={...}
 *     groupingId={...}
 *     defaultGroupingOptions={...}
 *     getAggregationsByGroupingField={getAggregationsByGroupingField}
 *     renderGroupPanel={renderGroupPanel}
 *     getGroupStats={getStats}
 *     services={{
 *       notifications,
 *       dataViews,
 *       http,
 *     }}
 *   >
 *     {(groupingFilters) => {
 *       const query = buildEsQuery({
 *         filters: groupingFilters,
 *       });
 *       return (
 *         <AlertsTable
 *           query={query}
 *           ...
 *         />
 *       );
 *     }}
 *   </AlertsGrouping>
 * );
 * ```
 *
 * To define your aggregations result type, extend the `BaseAlertsGroupAggregations` type:
 *
 * ```ts
 * import { BaseAlertsGroupAggregations } from '@kbn/alerts-grouping';
 *
 * interface YourAggregationsType extends BaseAlertsGroupAggregations {
 *   // Your custom aggregations here
 * }
 * ```
 *
 * Check {@link useGetAlertsGroupAggregationsQuery} for more info on alerts aggregations.
 */
export const AlertsGrouping = typedMemo(
  <T extends BaseAlertsGroupAggregations>(props: AlertsGroupingProps<T>) => {
    return (
      <AlertsGroupingContextProvider>
        <AlertsGroupingInternal {...props} />
      </AlertsGroupingContextProvider>
    );
  }
);
