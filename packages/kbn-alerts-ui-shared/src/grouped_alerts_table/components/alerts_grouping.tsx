/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import { isNoneGroup, useGrouping } from '@kbn/securitysolution-grouping';
import { isEqual } from 'lodash/fp';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { useDispatch } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { Provider } from 'react-redux';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useAlertDataView } from '../../..';
import { updateGroups } from '../store/actions';
import { GroupedSubLevel } from './alerts_sub_grouping';
import { groupIdSelector, useDeepEqualSelector } from '../store/selectors';
import { GroupedAlertsTableProps } from '../types';
import { renderGroupPanel } from './group_panel_renderers';
import { getStats } from './group_stats';
import { groupsReducer } from '../store/reducer';

const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_PAGE_INDEX = 0;
const MAX_GROUPING_LEVELS = 3;

const useStorage = (storage: Storage, tableId: string) =>
  useMemo(
    () => ({
      getStoragePageSize: (): number[] => {
        const pageSizes = storage.get(`grouping-table-${tableId}`);
        if (!pageSizes) {
          return Array(MAX_GROUPING_LEVELS).fill(DEFAULT_PAGE_SIZE);
        }
        return pageSizes;
      },
      setStoragePageSize: (pageSizes: number[]) => {
        storage.set(`grouping-table-${tableId}`, pageSizes);
      },
    }),
    [storage, tableId]
  );

const GroupedAlertsTableComponent = (props: GroupedAlertsTableProps) => {
  const { storage, dataViews, notifications, http } = props.services;
  const { dataViews: alertDataViews } = useAlertDataView({
    featureIds: props.featureIds,
    dataViewsService: dataViews,
    http,
    toasts: notifications.toasts,
  });
  const dataView = useMemo(() => alertDataViews?.[0], [alertDataViews]);
  const dispatch = useDispatch();
  const { getStoragePageSize, setStoragePageSize } = useStorage(storage, props.tableId);

  const onOptionsChange = useCallback(
    (options) => {
      dispatch(
        updateGroups({
          tableId: props.tableId,
          options,
        })
      );
    },
    [dispatch, props.tableId]
  );

  const { getGrouping, selectedGroups, setSelectedGroups } = useGrouping({
    componentProps: {
      groupPanelRenderer: renderGroupPanel,
      groupStatsRenderer: getStats,
      unit: (totalCount) =>
        i18n.translate('alertsUiShared.unit', {
          values: { totalCount },
          defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
        }),
    },
    defaultGroupingOptions: [
      {
        label: 'Rule',
        key: 'kibana.alert.rule.name',
      },
      {
        label: 'Username',
        key: 'user.name',
      },
      {
        label: 'Hostname',
        key: 'host.name',
      },
      {
        label: 'Source IP',
        key: 'source.ip',
      },
    ],
    fields: dataView?.fields ?? [],
    groupingId: props.tableId,
    maxGroupingLevels: MAX_GROUPING_LEVELS,
    onOptionsChange,
  });

  const groupId = useMemo(() => groupIdSelector(), []);
  const groupInRedux = useDeepEqualSelector((state) => groupId(state, props.tableId));
  useEffect(() => {
    // only ever set to `none` - siem only handles group selector when `none` is selected
    if (isNoneGroup(selectedGroups)) {
      // set active groups from selected groups
      dispatch(
        updateGroups({
          activeGroups: selectedGroups,
          tableId: props.tableId,
        })
      );
    }
  }, [dispatch, props.tableId, selectedGroups]);

  useEffect(() => {
    if (groupInRedux != null && !isNoneGroup(groupInRedux.activeGroups)) {
      // set selected groups from active groups
      setSelectedGroups(groupInRedux.activeGroups);
    }
  }, [groupInRedux, setSelectedGroups]);

  const [pageIndex, setPageIndex] = useState<number[]>(
    Array(MAX_GROUPING_LEVELS).fill(DEFAULT_PAGE_INDEX)
  );
  const [pageSize, setPageSize] = useState<number[]>(getStoragePageSize);

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
          setStoragePageSize(newArr);
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
    [setStoragePageSize]
  );

  const paginationResetTriggers = useRef({
    defaultFilters: props.defaultFilters,
    globalFilters: props.globalFilters,
    globalQuery: props.globalQuery,
    selectedGroups,
  });

  useEffect(() => {
    const triggers = {
      defaultFilters: props.defaultFilters,
      globalFilters: props.globalFilters,
      globalQuery: props.globalQuery,
      selectedGroups,
    };
    if (!isEqual(paginationResetTriggers.current, triggers)) {
      resetAllPagination();
      paginationResetTriggers.current = triggers;
    }
  }, [
    props.defaultFilters,
    props.globalFilters,
    props.globalQuery,
    resetAllPagination,
    selectedGroups,
  ]);

  const getLevel = useCallback(
    (level: number, selectedGroup: string, parentGroupingFilter?: string) => {
      let rcc;
      if (level < selectedGroups.length - 1) {
        rcc = (groupingFilters: Filter[]) => {
          return getLevel(
            level + 1,
            selectedGroups[level + 1],
            // stringify because if the filter is passed as an object, it will cause unnecessary re-rendering
            JSON.stringify([
              ...groupingFilters,
              ...(parentGroupingFilter ? JSON.parse(parentGroupingFilter) : []),
            ])
          );
        };
      } else {
        rcc = (groupingFilters: Filter[]) => {
          return props.renderChildComponent([
            ...groupingFilters,
            ...(parentGroupingFilter ? JSON.parse(parentGroupingFilter) : []),
          ]);
        };
      }

      const resetGroupChildrenPagination = (parentLevel: number) => {
        setPageIndex((allPages) => {
          const resetPages = allPages.splice(parentLevel + 1, allPages.length);
          return [...allPages, ...resetPages.map(() => DEFAULT_PAGE_INDEX)];
        });
      };

      if (!dataView) {
        return null;
      }

      return (
        <GroupedSubLevel
          {...props}
          dataView={dataView}
          getGrouping={getGrouping}
          groupingLevel={level}
          onGroupClose={() => resetGroupChildrenPagination(level)}
          pageIndex={pageIndex[level] ?? DEFAULT_PAGE_INDEX}
          pageSize={pageSize[level] ?? DEFAULT_PAGE_SIZE}
          parentGroupingFilter={parentGroupingFilter}
          renderChildComponent={rcc}
          selectedGroup={selectedGroup}
          setPageIndex={(newIndex: number) => setPageVar(newIndex, level, 'index')}
          setPageSize={(newSize: number) => setPageVar(newSize, level, 'size')}
        />
      );
    },
    [dataView, getGrouping, pageIndex, pageSize, props, selectedGroups, setPageVar]
  );

  // if (isEmpty(selectedPatterns)) {
  //   return null;
  // }

  if (!dataView) {
    return null;
  }

  return getLevel(0, selectedGroups[0]);
};

const store = configureStore({
  reducer: combineReducers({
    groups: groupsReducer,
  }),
});

export const GroupedAlertsTable = React.memo((props: GroupedAlertsTableProps) => {
  return (
    <Provider store={store}>
      <GroupedAlertsTableComponent {...props} />
    </Provider>
  );
});
