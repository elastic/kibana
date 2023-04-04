/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldSpec } from '@kbn/data-views-plugin/common';
import React, { useCallback, useEffect } from 'react';

import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import { GroupSelector, isNoneGroup } from '..';
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
  maxGroupingLevels?: number;
  onGroupChange?: (param: { groupByField: string; tableId: string }) => void;
  tracker?: (
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
  maxGroupingLevels = 1,
  onGroupChange,
  tracker,
}: UseGetGroupSelectorArgs) => {
  const { activeGroups: selectedGroups, options } =
    groupByIdSelector({ groups: groupingState }, groupingId) ?? defaultGroup;

  const setSelectedGroups = useCallback(
    (activeGroups: string[]) => {
      dispatch(
        groupActions.updateActiveGroups({
          id: groupingId,
          activeGroups,
        })
      );
    },
    [dispatch, groupingId]
  );

  const setOptions = useCallback(
    (newOptions: GroupOption[]) => {
      dispatch(groupActions.updateGroupOptions({ id: groupingId, newOptionList: newOptions }));
    },
    [dispatch, groupingId]
  );

  const onChange = useCallback(
    (groupSelection: string) => {
      if (selectedGroups.find((selected) => selected === groupSelection)) {
        const groups = selectedGroups.filter((selectedGroup) => selectedGroup !== groupSelection);
        setSelectedGroups(groups);
        if (groups.length === 0) {
          setSelectedGroups(['none']);
        }
        return;
      }

      const newSelectedGroups = isNoneGroup([groupSelection])
        ? [groupSelection]
        : [...selectedGroups.filter((selectedGroup) => selectedGroup !== 'none'), groupSelection];
      setSelectedGroups(newSelectedGroups);

      // built-in telemetry: UI-counter
      tracker?.(
        METRIC_TYPE.CLICK,
        getTelemetryEvent.groupChanged({ groupingId, selected: groupSelection })
      );

      onGroupChange?.({ tableId: groupingId, groupByField: groupSelection });

      // only update options if the new selection is a custom field
      if (
        !isNoneGroup([groupSelection]) &&
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
      onGroupChange,
      options,
      selectedGroups,
      setOptions,
      setSelectedGroups,
      tracker,
    ]
  );

  useEffect(() => {
    // only set options the first time, all other updates will be taken care of by onGroupChange
    if (options.length > 0) return;
    setOptions(
      defaultGroupingOptions.find((o) => selectedGroups.find((selected) => selected === o.key))
        ? defaultGroupingOptions
        : [
            ...defaultGroupingOptions,
            ...(!isNoneGroup(selectedGroups)
              ? selectedGroups.map((selectedGroup) => ({
                  key: selectedGroup,
                  label: selectedGroup,
                }))
              : []),
          ]
    );
  }, [defaultGroupingOptions, options, selectedGroups, setOptions]);

  return (
    <GroupSelector
      {...{
        groupingId,
        groupsSelected: selectedGroups,
        'data-test-subj': 'alerts-table-group-selector',
        onGroupChange: onChange,
        fields,
        maxGroupingLevels,
        options,
      }}
    />
  );
};
