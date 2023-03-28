/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo } from 'react';
import { groupActions, groupByIdSelector } from './state';
import { Action, defaultGroup, GroupMap } from './types';

export interface UseGroupingPaginationArgs {
  dispatch: React.Dispatch<Action>;
  groupingId: string;
  groupingState: GroupMap;
}

export const useGroupingPagination = ({
  groupingId,
  groupingState,
  dispatch,
}: UseGroupingPaginationArgs) => {
  const { activePage, itemsPerPage } =
    groupByIdSelector({ groups: groupingState }, groupingId) ?? defaultGroup;

  const setGroupsActivePage = useCallback(
    (newActivePage: number) => {
      dispatch(groupActions.updateGroupActivePage({ id: groupingId, activePage: newActivePage }));
    },
    [dispatch, groupingId]
  );

  const setGroupsItemsPerPage = useCallback(
    (newItemsPerPage: number) => {
      dispatch(
        groupActions.updateGroupItemsPerPage({ id: groupingId, itemsPerPage: newItemsPerPage })
      );
    },
    [dispatch, groupingId]
  );

  return useMemo(
    () => ({
      pageIndex: activePage,
      pageSize: itemsPerPage,
      onChangeItemsPerPage: setGroupsItemsPerPage,
      onChangePage: setGroupsActivePage,
      itemsPerPageOptions: [10, 25, 50, 100],
    }),
    [activePage, itemsPerPage, setGroupsActivePage, setGroupsItemsPerPage]
  );
};
