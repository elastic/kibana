/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { useCallback, useEffect } from 'react';

import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { getGroupSelector, isNoneGroup } from '../..';
import { groupActions, groupByIdSelector } from './state';
import type { GroupOption } from './types';
import { Action, defaultGroup, GroupMap } from './types';
import { getTelemetryEvent } from '../telemetry/const';

export interface UseGetGroupSelectorArgs {
  defaultGroupingOptions: GroupOption[];
  dispatch: React.Dispatch<Action>;
  fields: FieldSpec[];
  groupingId: string;
  groupingState: GroupMap;
  onGroupChangeCallback?: (param: { groupByField: string; tableId: string }) => void;
  tracker: (
    type: UiCounterMetricType,
    event: string | string[],
    count?: number | undefined
  ) => void;
}

export const useGetGroupSelector = ({
  defaultGroupingOptions,
  dispatch,
  fields,
  groupingId,
  groupingState,
  onGroupChangeCallback,
  tracker,
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

      // built-in telemetry: UI-counter
      tracker?.(
        METRIC_TYPE.CLICK,
        getTelemetryEvent.groupChanged({ groupingId, selected: groupSelection })
      );

      onGroupChangeCallback?.({ tableId: groupingId, groupByField: groupSelection });

      // only update options if the new selection is a custom field
      if (
        !isNoneGroup(groupSelection) &&
        !options.find((o: GroupOption) => o.key === groupSelection)
      ) {
        setOptions([
          ...defaultGroupingOptions,
          {
            label: groupSelection,
            key: groupSelection,
          },
        ]);
      }
    },
    [
      defaultGroupingOptions,
      groupingId,
      onGroupChangeCallback,
      options,
      selectedGroup,
      setGroupsActivePage,
      setOptions,
      setSelectedGroup,
      tracker,
    ]
  );

  useEffect(() => {
    // only set options the first time, all other updates will be taken care of by onGroupChange
    if (options.length > 0) return;
    setOptions(
      defaultGroupingOptions.find((o) => o.key === selectedGroup)
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
          ]
    );
  }, [defaultGroupingOptions, options.length, selectedGroup, setOptions]);

  return getGroupSelector({
    groupingId,
    groupSelected: selectedGroup,
    'data-test-subj': 'alerts-table-group-selector',
    onGroupChange,
    fields,
    options,
  });
};
