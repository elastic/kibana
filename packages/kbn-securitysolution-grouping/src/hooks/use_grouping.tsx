/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FieldSpec } from '@kbn/data-views-plugin/common';
import React, { useCallback, useMemo } from 'react';
import { GroupingProps, GroupSelectorProps } from '..';
import { useGroupingPagination } from './use_grouping_pagination';
import {
  groupActions,
  groupByIdSelector,
  useGroupingStateManager,
} from './use_grouping_state_manager';
import { useGetGroupSelector } from './use_get_group_selector';
import { defaultGroup, GroupOption } from './types';
import { Grouping as GroupingComponent } from '../components/grouping';

interface Grouping {
  getGrouping: (
    props: Omit<GroupingProps, 'groupSelector' | 'pagination' | 'selectedGroup'>
  ) => React.ReactElement<GroupingProps>;
  groupSelector: React.ReactElement<GroupSelectorProps>;
  initializeGrouping: (groupId: string) => void;
  pagination: {
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
export const useGrouping = ({
  defaultGroupingOptions,
  fields,
  groupingId,
}: GroupingArgs): Grouping => {
  const { state: groupingState, dispatch } = useGroupingStateManager();
  const { activeGroup: selectedGroup } =
    groupByIdSelector({ groups: groupingState }, groupingId) ?? defaultGroup;
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
      props: Omit<GroupingProps, 'groupSelector' | 'pagination' | 'selectedGroup'>
    ): React.ReactElement<GroupingProps> => (
      <GroupingComponent
        {...props}
        groupSelector={groupSelector}
        pagination={pagination}
        selectedGroup={selectedGroup}
      />
    ),
    [groupSelector, pagination, selectedGroup]
  );

  const initializeGrouping = useCallback(
    (id: string) => dispatch(groupActions.initGrouping({ id })),
    [dispatch]
  );

  return useMemo(
    () => ({
      getGrouping,
      groupSelector,
      initializeGrouping,
      selectedGroup,
      pagination: {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      },
    }),
    [
      getGrouping,
      groupSelector,
      initializeGrouping,
      pagination.pageIndex,
      pagination.pageSize,
      selectedGroup,
    ]
  );
};
