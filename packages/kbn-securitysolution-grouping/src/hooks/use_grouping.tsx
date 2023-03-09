/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import React, { useCallback, useMemo, useReducer } from 'react';
import { groupsReducerWithStorage, initialState } from './state/reducer';
import { GroupingProps, GroupSelectorProps } from '..';
import { useGroupingPagination } from './use_grouping_pagination';
import { groupActions, groupByIdSelector } from './state';
import { useGetGroupSelector } from './use_get_group_selector';
import { defaultGroup, GroupOption, GroupsPagingSettingsById } from './types';
import { Grouping as GroupingComponent } from '../components/grouping';

interface Grouping<T> {
  getGrouping: (
    props: Omit<GroupingProps<T>, 'groupSelector' | 'pagination'>
  ) => React.ReactElement<GroupingProps<T>>;
  groupSelector: React.ReactElement<GroupSelectorProps>;
  pagination: {
    pagingSettings: GroupsPagingSettingsById;
    reset: () => void;
  };
  selectedGroups: string[];
}

interface GroupingArgs {
  defaultGroupingOptions: GroupOption[];
  maxGroupingLevels?: number;
  fields: FieldSpec[];
  groupingId: string;
}
export const useGrouping = <T,>({
  defaultGroupingOptions,
  fields,
  groupingId,
  maxGroupingLevels,
}: GroupingArgs): Grouping<T> => {
  const [groupingState, dispatch] = useReducer(groupsReducerWithStorage, initialState);
  const { activeGroups: selectedGroups } = useMemo(
    () => groupByIdSelector({ groups: groupingState }, groupingId) ?? defaultGroup,
    [groupingId, groupingState]
  );

  const groupSelector = useGetGroupSelector({
    defaultGroupingOptions,
    dispatch,
    fields,
    groupingId,
    groupingState,
    maxGroupingLevels,
  });

  const pagination = useGroupingPagination({ groupingId, groupingState, dispatch });

  const getGrouping = useCallback(
    (
      props: Omit<GroupingProps<T>, 'groupSelector' | 'pagination'>
    ): React.ReactElement<GroupingProps<T>> => (
      <GroupingComponent {...props} pagination={pagination} />
    ),
    [pagination]
  );

  const resetPagination = useCallback(() => {
    selectedGroups.forEach((selectedGroup, i, arr) => {
      dispatch(
        groupActions.updateGroupActivePage({ id: groupingId, activePage: 0, selectedGroup })
      );
    });
  }, [groupingId, selectedGroups]);

  return useMemo(
    () => ({
      getGrouping,
      groupSelector,
      selectedGroups,
      pagination: {
        pagingSettings: pagination.pagingSettings,
        reset: resetPagination,
      },
    }),
    [getGrouping, groupSelector, pagination.pagingSettings, resetPagination, selectedGroups]
  );
};
