/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { METRIC_TYPE, UiCounterMetricType } from '@kbn/analytics';
import React, { useCallback, useEffect } from 'react';

import { groupActions, groupByIdSelector } from './state';
import type { GroupOption } from './types';
import { Action, defaultGroup, GroupMap } from './types';
import { GroupSelector, isNoneGroup } from '..';
import { getTelemetryEvent } from '../telemetry/const';

export interface UseGetGroupSelectorArgs {
  defaultGroupingOptions: GroupOption[];
  dispatch: React.Dispatch<Action>;
  fields: FieldSpec[];
  groupingId: string;
  groupingState: GroupMap;
  maxGroupingLevels?: number;
  onOptionsChange?: (newOptions: GroupOption[]) => void;
  onGroupChange?: (param: { groupByField: string; tableId: string }) => void;
  tracker?: (
    type: UiCounterMetricType,
    event: string | string[],
    count?: number | undefined
  ) => void;
}

interface UseGetGroupSelectorStateless
  extends Pick<
    UseGetGroupSelectorArgs,
    'defaultGroupingOptions' | 'groupingId' | 'fields' | 'maxGroupingLevels'
  > {
  onGroupChange: (selectedGroups: string[]) => void;
}

// only use this component to use a group selector that displays when isNoneGroup is true
// by selecting a group with the groupSelectorStateless component
// the contents are within the grouping component and from that point
// the grouping component will handle the group selector. When the group selector is set back to none,
// the consumer can again use the groupSelectorStateless component to select a new group
export const useGetGroupSelectorStateless = ({
  defaultGroupingOptions,
  groupingId,
  fields,
  onGroupChange,
  maxGroupingLevels,
}: UseGetGroupSelectorStateless) => {
  const onChange = useCallback(
    (groupSelection: string) => {
      onGroupChange([groupSelection]);
    },
    [onGroupChange]
  );

  return (
    <GroupSelector
      {...{
        groupingId,
        groupsSelected: ['none'],
        'data-test-subj': 'alerts-table-group-selector',
        onGroupChange: onChange,
        fields,
        maxGroupingLevels,
        options: defaultGroupingOptions,
      }}
    />
  );
};

export const useGetGroupSelector = ({
  defaultGroupingOptions,
  dispatch,
  fields,
  groupingId,
  groupingState,
  maxGroupingLevels = 1,
  onGroupChange,
  onOptionsChange,
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
      onOptionsChange?.(newOptions);
    },
    [dispatch, groupingId, onOptionsChange]
  );

  const onChange = useCallback(
    (groupSelection: string) => {
      if (selectedGroups.find((selected) => selected === groupSelection)) {
        const groups = selectedGroups.filter((selectedGroup) => selectedGroup !== groupSelection);
        if (groups.length === 0) {
          setSelectedGroups(['none']);
        } else {
          setSelectedGroups(groups);
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
    },
    [groupingId, onGroupChange, selectedGroups, setSelectedGroups, tracker]
  );

  useEffect(() => {
    if (options.length === 0 && defaultGroupingOptions.length > 0) {
      return setOptions(
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
    }
    if (isNoneGroup(selectedGroups)) {
      return;
    }

    const currentOptionKeys = options.map((o) => o.key);
    const newOptions = [...options];
    selectedGroups.forEach((groupSelection) => {
      if (currentOptionKeys.includes(groupSelection)) {
        return;
      }
      // these are custom fields
      newOptions.push({
        label: groupSelection,
        key: groupSelection,
      });
    });

    if (newOptions.length !== options.length) {
      setOptions(newOptions);
    }
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
