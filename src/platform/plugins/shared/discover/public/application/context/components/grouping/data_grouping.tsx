/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Dispatch, SetStateAction } from 'react';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import type { GroupOption } from '@kbn/grouping';
import { isNoneGroup, useGrouping } from '@kbn/grouping';
import { isEqual } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { DataGroupingLevelProps } from './data_grouping_level';
import { DataGroupingLevel } from './data_grouping_level';
import type { DataGroupingProps, BaseDataGroupAggregations, DataByGroupingAgg } from './types';
import { DEFAULT_PAGE_INDEX, DEFAULT_PAGE_SIZE, MAX_GROUPING_LEVELS } from './constants';
import { DataGroupingContextProvider, useDataGroupingState } from './data_grouping_context';
import { renderGroupPanel } from './group_panels/render_group_panel';
import { getGroupStats } from './get_group_stats';

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
}: Pick<DataGroupingLevelProps<BaseDataGroupAggregations>, 'children' | 'parentGroupingFilter'> & {
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

const queryClient = new QueryClient();

const DataGroupingInternal = <T extends BaseDataGroupAggregations>(props: DataGroupingProps<T>) => {
  const { groupingId, dataView, stateContainer, defaultGroupingOptions, defaultFilters, children } =
    props;
  const { grouping, updateGrouping } = useDataGroupingState(groupingId);

  const globalState = stateContainer.globalState.get();
  const globalFilters = globalState?.filters;
  const globalQuery = globalState?.query;
  const [pageSize, setPageSize] = useLocalStorage<number[]>(
    `grouping-table-${groupingId}`,
    Array(MAX_GROUPING_LEVELS).fill(DEFAULT_PAGE_SIZE)
  ) as [number[], Dispatch<SetStateAction<number[]>>, () => void];

  const onOptionsChange = useCallback(
    (options: GroupOption[]) => {
      // useGrouping > useDataGroupingState options sync
      // the available grouping options change when the user selects
      // a new field not in the default ones
      updateGrouping({
        options,
      });
    },
    [updateGrouping]
  );

  const { getGrouping, selectedGroups, setSelectedGroups } = useGrouping<DataByGroupingAgg>({
    componentProps: {
      groupPanelRenderer: renderGroupPanel,
      getGroupStats,
      unit: (totalCount) =>
        i18n.translate('dataGrouping.unit', {
          values: { totalCount },
          defaultMessage: `{totalCount, plural, =1 {document} other {documents}}`,
        }),
    },
    defaultGroupingOptions,
    fields: dataView?.fields ?? [],
    groupingId,
    maxGroupingLevels: MAX_GROUPING_LEVELS,
    onOptionsChange,
    title: 'Group documents by',
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
        <DataGroupingLevel<DataByGroupingAgg>
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
        </DataGroupingLevel>
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

export const DataGrouping = typedMemo(
  <T extends BaseDataGroupAggregations>(props: DataGroupingProps<T>) => {
    return (
      <QueryClientProvider client={queryClient}>
        <DataGroupingContextProvider>
          <DataGroupingInternal {...props} />
        </DataGroupingContextProvider>
      </QueryClientProvider>
    );
  }
);
