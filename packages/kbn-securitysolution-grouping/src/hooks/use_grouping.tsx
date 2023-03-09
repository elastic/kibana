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
import { defaultGroup, GroupOption } from './types';
import { Grouping as GroupingComponent } from '../components/grouping';

interface Grouping<T> {
  getGrouping: (
    props: Omit<GroupingProps<T>, 'groupSelector' | 'pagination' | 'selectedGroup'>
  ) => React.ReactElement<GroupingProps<T>>;
  groupSelector: React.ReactElement<GroupSelectorProps>;
  pagination: {
    reset: () => void;
    pageIndex: number;
    pageSize: number;
  };
  selectedGroup: string;
}

interface GroupingArgs {
  defaultGroupingOptions: GroupOption[];

  fields: FieldSpec[];
  groupingId: string;
}
export const useGrouping = <T,>({
  defaultGroupingOptions,
  fields,
  groupingId,
}: GroupingArgs): Grouping<T> => {
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
  });

  const pagination = useGroupingPagination({ groupingId, groupingState, dispatch });

  const getGrouping = useCallback(
    (
      props: Omit<GroupingProps<T>, 'groupSelector' | 'pagination' | 'selectedGroup'>
    ): React.ReactElement<GroupingProps<T>> => (
      <GroupingComponent
        {...props}
        groupSelector={groupSelector}
        pagination={pagination}
        selectedGroup={selectedGroup}
      />
    ),
    [groupSelector, pagination, selectedGroup]
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
