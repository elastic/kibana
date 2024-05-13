/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import { isNoneGroup, useGrouping } from '@kbn/securitysolution-grouping';
import { isEqual } from 'lodash/fp';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { i18n } from '@kbn/i18n';
import { useAlertDataView } from '../../common/hooks';
import { AlertsGroupingLevel } from './alerts_grouping_level';
import { AlertsGroupingProps } from '../types';
import { renderGroupPanel } from './group_panel_renderers';
import { getStats } from './group_stats';
import {
  AlertsGroupingContextProvider,
  useAlertsGroupingState,
} from '../contexts/alerts_grouping_context';

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

const AlertsGroupingInternal = (props: AlertsGroupingProps) => {
  const {
    tableId,
    services,
    featureIds,
    defaultGroupingOptions,
    defaultFilters,
    globalFilters,
    globalQuery,
    renderChildComponent,
  } = props;
  const { storage, dataViews, notifications, http } = services;
  const { grouping, updateGrouping } = useAlertsGroupingState(tableId);

  const { dataViews: alertDataViews } = useAlertDataView({
    featureIds,
    dataViewsService: dataViews,
    http,
    toasts: notifications.toasts,
  });
  const dataView = useMemo(() => alertDataViews?.[0], [alertDataViews]);
  const { getStoragePageSize, setStoragePageSize } = useStorage(storage, tableId);

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
      groupStatsRenderer: getStats,
      unit: (totalCount) =>
        i18n.translate('alertsUiShared.unit', {
          values: { totalCount },
          defaultMessage: `{totalCount, plural, =1 {alert} other {alerts}}`,
        }),
    },
    defaultGroupingOptions,
    fields: dataView?.fields ?? [],
    groupingId: tableId,
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
    (level: number, selectedGroup: string, parentGroupingFilter?: string) => {
      const rcc =
        level < selectedGroups.length - 1
          ? (groupingFilters: Filter[]) => {
              return getLevel(
                level + 1,
                selectedGroups[level + 1],
                // stringify because if the filter is passed as an object, it will cause unnecessary re-rendering
                JSON.stringify([
                  ...groupingFilters,
                  ...(parentGroupingFilter ? JSON.parse(parentGroupingFilter) : []),
                ])
              )!;
            }
          : (groupingFilters: Filter[]) => {
              return renderChildComponent([
                ...groupingFilters,
                ...(parentGroupingFilter ? JSON.parse(parentGroupingFilter) : []),
              ]);
            };

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
        <AlertsGroupingLevel
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
    [
      dataView,
      getGrouping,
      pageIndex,
      pageSize,
      props,
      renderChildComponent,
      selectedGroups,
      setPageVar,
    ]
  );

  if (!dataView) {
    return null;
  }

  return getLevel(0, selectedGroups[0]);
};

/**
 * A coordinator component to show multiple alert tables grouped by one or more fields
 *
 * @example Basic grouping
 * ```ts
 * const {
 *   uiSettings,
 *   storage,
 *   notifications,
 *   dataViews,
 *   http,
 *   data,
 * } = useKibana().services;
 *
 * const renderAlertsTable = useCallback(
 *   (groupingFilters: Filter[]) => {
 *     const query = buildEsQuery({
 *       filters: groupingFilters,
 *     });
 *     return (
 *       <AlertsTable
 *         id={...}
 *         featureIds={[...]}
 *         configurationId={AlertConsumers.OBSERVABILITY}
 *         query={query}
 *         alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
 *       />
 *     );
 *   },
 *   [AlertsTable, alertsTableConfigurationRegistry]
 * );
 *
 * return <AlertsGrouping
 *   featureIds={[...]} // The same feature ids used in the table
 *   renderChildComponent={renderAlertsTable} // Renderer of the alerts table in leaf panels
 *   tableId={...} // The rendered alerts table id
 *   getAggregationsByGroupingField={...} // A getter from field id to a list of stats aggregations
 *   services={{
 *     uiSettings,
 *     storage,
 *     notifications,
 *     dataViews,
 *     http,
 *     data,
 *   }}
 * />
 * ```
 */
export const AlertsGrouping = memo((props: AlertsGroupingProps) => {
  return (
    <AlertsGroupingContextProvider>
      <AlertsGroupingInternal {...props} />
    </AlertsGroupingContextProvider>
  );
});
