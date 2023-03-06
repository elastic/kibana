/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { useCallback, useEffect } from 'react';

import { getGroupSelector, isNoneGroup } from '../..';
import { groupActions, groupByIdSelector } from './state';
import type { GroupOption } from './types';
import { Action, defaultGroup, GroupMap } from './types';

export interface UseGetGroupSelectorArgs {
  defaultGroupingOptions: GroupOption[];
  dispatch: React.Dispatch<Action>;
  fields: FieldSpec[];
  groupingId: string;
  groupingState: GroupMap;
}

export const useGetGroupSelector = ({
  defaultGroupingOptions,
  dispatch,
  fields,
  groupingId,
  groupingState,
}: UseGetGroupSelectorArgs) => {
  const { activeGroup: selectedGroup, options } =
    groupByIdSelector({ groups: groupingState }, groupingId) ?? defaultGroup;

  const setGroupsActivePage = useCallback(
    (activePage: number) => {
      dispatch(groupActions.updateGroupActivePage({ id: groupingId, activePage }));
    },
    [dispatch, groupingId]
  );

  const setSelectedGroup = useCallback(
    (activeGroup: string) => {
      dispatch(groupActions.updateActiveGroup({ id: groupingId, activeGroup }));
    },
    [dispatch, groupingId]
  );

  const setOptions = useCallback(
    (newOptions: GroupOption[]) => {
      dispatch(groupActions.updateGroupOptions({ id: groupingId, newOptionList: newOptions }));
    },
    [dispatch, groupingId]
  );

  const onGroupChange = useCallback(
    (groupSelection: string) => {
      if (groupSelection === selectedGroup) {
        return;
      }
      setGroupsActivePage(0);
      setSelectedGroup(groupSelection);
    },
    [selectedGroup, setGroupsActivePage, setSelectedGroup]
  );

  useEffect(() => {
    if (defaultGroupingOptions.length === 0) return;
    const newOptions = defaultGroupingOptions.find((o) => o.key === selectedGroup)
      ? defaultGroupingOptions
      : [
          ...defaultGroupingOptions,
          ...(!isNoneGroup(selectedGroup)
            ? [
                {
                  key: selectedGroup,
                  label: selectedGroup,
                },
              ]
            : []),
        ];
    setOptions(newOptions);
  }, [defaultGroupingOptions, selectedGroup, setOptions]);
  return getGroupSelector({
    groupSelected: selectedGroup,
    'data-test-subj': 'alerts-table-group-selector',
    onGroupChange,
    fields,
    options,
  });
};
