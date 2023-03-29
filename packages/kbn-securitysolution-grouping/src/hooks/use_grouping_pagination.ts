/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo } from 'react';
import { groupActions, groupByIdSelector } from './state';
import { Action, defaultGroup, GroupMap, GroupsPagingSettingsById } from './types';

export interface UseGroupingPaginationArgs {
  dispatch: React.Dispatch<Action>;
  groupingId: string;
  groupingState: GroupMap;
}

interface GroupingPagination {
  itemsPerPageOptions: number[];
  onChangeItemsPerPage: (newItemsPerPage: number, selectedGroup: string) => void;
  onChangePage: (newActivePage: number, selectedGroup: string) => void;
  pagingSettings: GroupsPagingSettingsById;
  resetPagination: () => void;
}

export const useGroupingPagination = ({
  groupingId,
  groupingState,
  dispatch,
}: UseGroupingPaginationArgs): GroupingPagination => {
  const { activeGroups: selectedGroups, pagingSettings } = useMemo(
    () => groupByIdSelector({ groups: groupingState }, groupingId) ?? defaultGroup,
    [groupingId, groupingState]
  );

  const resetPagination = useCallback(() => {
    console.log('packages: resetPagination', { groupingId, selectedGroups });
    selectedGroups.forEach((selectedGroup) => {
      dispatch(
        groupActions.updateGroupActivePage({ id: groupingId, activePage: 0, selectedGroup })
      );
    });
  }, [dispatch, groupingId, selectedGroups]);

  const setGroupsActivePage = useCallback(
    (newActivePage: number, selectedGroup: string) => {
      dispatch(
        groupActions.updateGroupActivePage({
          id: groupingId,
          activePage: newActivePage,
          selectedGroup,
        })
      );
    },
    [dispatch, groupingId]
  );

  const setGroupsItemsPerPage = useCallback(
    (newItemsPerPage: number, selectedGroup: string) => {
      dispatch(
        groupActions.updateGroupItemsPerPage({
          id: groupingId,
          itemsPerPage: newItemsPerPage,
          selectedGroup,
        })
      );
    },
    [dispatch, groupingId]
  );

  return useMemo(
    () => ({
      itemsPerPageOptions: [10, 25, 50, 100],
      onChangeItemsPerPage: setGroupsItemsPerPage,
      onChangePage: setGroupsActivePage,
      pagingSettings,
      resetPagination,
    }),
    [pagingSettings, resetPagination, setGroupsActivePage, setGroupsItemsPerPage]
  );
};
