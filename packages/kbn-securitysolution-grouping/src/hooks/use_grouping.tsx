/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import React, { useCallback, useMemo, useReducer } from 'react';
import { UiCounterMetricType } from '@kbn/analytics';
import { groupsReducerWithStorage, initialState } from './state/reducer';
import { GroupingProps, GroupSelectorProps, isNoneGroup } from '..';
import { useGroupingPagination } from './use_grouping_pagination';
import { groupActions, groupByIdSelector } from './state';
import { useGetGroupSelector } from './use_get_group_selector';
import { defaultGroup, GroupOption } from './types';
import { Grouping as GroupingComponent } from '../components/grouping';

type GetGroupingArgs<T> = Pick<GroupingProps<T>, 'data' | 'isLoading' | 'takeActionItems'>;

interface Grouping<T> {
  getGrouping: (props: GetGroupingArgs<T>) => React.ReactElement;
  groupSelector: React.ReactElement<GroupSelectorProps>;
  pagination: {
    reset: () => void;
    pageIndex: number;
    pageSize: number;
  };
  selectedGroup: string;
}

type ComponentProps<T> = Pick<
  GroupingProps<T>,
  | 'groupPanelRenderer'
  | 'groupStatsRenderer'
  | 'inspectButton'
  | 'onGroupToggle'
  | 'renderChildComponent'
  | 'unit'
>;

interface GroupingArgs<T> {
  componentProps: ComponentProps<T>;
  // provide default groups with the metrics settings
  // available without customization
  defaultGroupingOptions: GroupOption[];
  // FieldSpec array serialized version of DataViewField fields
  // Available in the custom grouping options
  fields: FieldSpec[];
  // Unique identifier of the grouping component.
  // Used in local storage
  groupingId: string;
  // for tracking
  onGroupChangeCallback?: (param: { groupByField: string; tableId: string }) => void;
  tracker?: (
    type: UiCounterMetricType,
    event: string | string[],
    count?: number | undefined
  ) => void;
}

export const useGrouping = <T,>({
  defaultGroupingOptions,
  fields,
  groupingId,
  onGroupChangeCallback,
  tracker,
  componentProps,
}: GroupingArgs<T>): Grouping<T> => {
  const [groupingState, dispatch] = useReducer(groupsReducerWithStorage, initialState);

  const { activeGroup: selectedGroup } = useMemo(
    () => groupByIdSelector({ groups: groupingState }, groupingId) ?? defaultGroup,
    [groupingId, groupingState]
  );

  const groupSelector = useGetGroupSelector({
    defaultGroupingOptions,
    dispatch,
    fields,
    groupingId,
    groupingState,
    onGroupChangeCallback,
    tracker,
  });

  const pagination = useGroupingPagination({ groupingId, groupingState, dispatch });

  const getGrouping = useCallback(
    (props: GetGroupingArgs<T>): React.ReactElement =>
      isNoneGroup(selectedGroup) ? (
        componentProps.renderChildComponent([])
      ) : (
        <GroupingComponent
          {...componentProps}
          {...props}
          groupingId={groupingId}
          groupSelector={groupSelector}
          pagination={pagination}
          selectedGroup={selectedGroup}
          tracker={tracker}
        />
      ),
    [componentProps, groupSelector, groupingId, pagination, selectedGroup, tracker]
  );

  const resetPagination = useCallback(() => {
    dispatch(groupActions.updateGroupActivePage({ id: groupingId, activePage: 0 }));
  }, [groupingId]);

  return useMemo(
    () => ({
      getGrouping,
      groupSelector,
      selectedGroup,
      pagination: {
        reset: resetPagination,
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      },
    }),
    [
      getGrouping,
      groupSelector,
      pagination.pageIndex,
      pagination.pageSize,
      resetPagination,
      selectedGroup,
    ]
  );
};
