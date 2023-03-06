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
      console.log('updateGroupActivePage');
      dispatch(groupActions.updateGroupActivePage({ id: groupingId, activePage }));
    },
    [dispatch, groupingId]
  );

  const setSelectedGroup = useCallback(
    (activeGroup: string) => {
      console.log('updateActiveGroup');
      dispatch(groupActions.updateActiveGroup({ id: groupingId, activeGroup }));
    },
    [dispatch, groupingId]
  );

  const setOptions = useCallback(
    (newOptions: GroupOption[]) => {
      console.log('updateGroupOptions');
      dispatch(groupActions.updateGroupOptions({ id: groupingId, newOptionList: newOptions }));
    },
    [dispatch, groupingId]
  );

  const onGroupChange = useCallback(
    (groupSelection: string) => {
      console.log('onGroupChange!!!!!!!');
      if (groupSelection === selectedGroup) {
        return;
      }
      setGroupsActivePage(0);
      setSelectedGroup(groupSelection);
      // i dont think we need this??
      if (
        !isNoneGroup(groupSelection) &&
        !options.find((o: GroupOption) => o.key === groupSelection)
      ) {
        console.log('called set uptions 1');
        setOptions([
          ...defaultGroupingOptions,
          {
            label: groupSelection,
            key: groupSelection,
          },
        ]);
      } else {
        setOptions(defaultGroupingOptions);
        console.log('called set uptions 2');
      }
    },
    [
      defaultGroupingOptions,
      options,
      selectedGroup,
      setGroupsActivePage,
      setOptions,
      setSelectedGroup,
    ]
  );

  useEffect(() => {
    if (defaultGroupingOptions.length === 0) return;
    console.log('selectedGroup', selectedGroup);
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
    console.log('called set uptions UE');
  }, [defaultGroupingOptions, selectedGroup, setOptions]);
  console.log({ options });
  return getGroupSelector({
    groupSelected: selectedGroup,
    'data-test-subj': 'alerts-table-group-selector',
    onGroupChange,
    fields,
    options,
  });
};
