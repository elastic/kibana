/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { UiCounterMetricType } from '@kbn/analytics';
import { METRIC_TYPE } from '@kbn/analytics';
import React, { useCallback, useEffect, useMemo } from 'react';

import { groupActions, groupByIdSelector } from './state';
import type { GroupOption, Action, GroupMap, GroupSettings } from './types';
import { defaultGroup } from './types';
import { GroupSelector, isNoneGroup } from '..';
import { validateEnforcedGroups, ensureEnforcedGroupsInFront } from '../helpers';
import { getTelemetryEvent } from '../telemetry/const';

export interface UseGetGroupSelectorArgs {
  defaultGroupingOptions: GroupOption[];
  dispatch: React.Dispatch<Action>;
  fields: FieldSpec[];
  groupingId: string;
  groupingState: GroupMap;
  maxGroupingLevels?: number;
  onOptionsChange?: (newOptions: GroupOption[]) => void;
  onGroupChange?: (param: {
    groupByField: string;
    groupByFields: string[];
    tableId: string;
  }) => void;
  tracker?: (
    type: UiCounterMetricType,
    event: string | string[],
    count?: number | undefined
  ) => void;
  title?: string;
  onOpenTracker?: (
    type: UiCounterMetricType,
    event: string | string[],
    count?: number | undefined
  ) => void;
  settings?: GroupSettings;
}

interface UseGetGroupSelectorStateless
  extends Pick<
    UseGetGroupSelectorArgs,
    'defaultGroupingOptions' | 'groupingId' | 'fields' | 'maxGroupingLevels' | 'settings'
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
  settings,
}: UseGetGroupSelectorStateless) => {
  const onChange = useCallback(
    (groupSelection: string) => {
      onGroupChange([groupSelection]);
    },
    [onGroupChange]
  );

  return useMemo(() => {
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
          settings,
        }}
      />
    );
  }, [groupingId, fields, maxGroupingLevels, defaultGroupingOptions, onChange, settings]);
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
  title,
  onOpenTracker,
  settings,
}: UseGetGroupSelectorArgs) => {
  // Validate enforced groups configuration
  validateEnforcedGroups(settings, maxGroupingLevels);

  const {
    activeGroups: selectedGroups,
    options,
    settings: groupSettings,
  } = groupByIdSelector({ groups: groupingState }, groupingId) ?? defaultGroup;

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

  // Automatically add enforced groups to activeGroups if they're not already present
  // Enforced groups should always be in front of the array
  useEffect(() => {
    const enforcedGroups = groupSettings?.enforcedGroups;
    if (enforcedGroups && enforcedGroups.length > 0) {
      const newGroups = ensureEnforcedGroupsInFront(selectedGroups, enforcedGroups);
      // Only update if order changed
      if (JSON.stringify(newGroups) !== JSON.stringify(selectedGroups)) {
        setSelectedGroups(newGroups);
      }
    }
  }, [groupSettings?.enforcedGroups, selectedGroups, setSelectedGroups]);

  const onChange = useCallback(
    (groupSelection: string) => {
      const enforcedGroups = groupSettings?.enforcedGroups ?? [];
      let newSelectedGroups: string[] = [];
      let sendTelemetry = true;
      // Simulate a toggle behavior when maxGroupingLevels is 1
      if (maxGroupingLevels === 1) {
        newSelectedGroups = [groupSelection];
      } else {
        // if the group is already selected, remove it
        if (selectedGroups.find((selected) => selected === groupSelection)) {
          sendTelemetry = false;
          const groups = selectedGroups.filter((selectedGroup) => selectedGroup !== groupSelection);
          if (groups.length === 0) {
            newSelectedGroups = ['none'];
          } else {
            newSelectedGroups = groups;
          }
        } else {
          newSelectedGroups = isNoneGroup([groupSelection])
            ? [groupSelection]
            : [
                ...selectedGroups.filter((selectedGroup) => selectedGroup !== 'none'),
                groupSelection,
              ];
        }
      }

      // Ensure enforced groups are always included and placed in front
      newSelectedGroups = ensureEnforcedGroupsInFront(newSelectedGroups, enforcedGroups);
      setSelectedGroups(newSelectedGroups);

      if (sendTelemetry) {
        // built-in telemetry: UI-counter
        tracker?.(
          METRIC_TYPE.CLICK,
          getTelemetryEvent.groupChanged({ groupingId, selected: groupSelection })
        );
      }

      onGroupChange?.({
        tableId: groupingId,
        groupByField: groupSelection,
        groupByFields: newSelectedGroups,
      });
    },
    [
      groupingId,
      maxGroupingLevels,
      onGroupChange,
      selectedGroups,
      setSelectedGroups,
      tracker,
      groupSettings?.enforcedGroups,
    ]
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

  useEffect(() => {
    dispatch(
      groupActions.updateGroupSettings({
        id: groupingId,
        settings,
      })
    );
  }, [dispatch, groupingId, settings]);

  return useMemo(() => {
    return (
      <GroupSelector
        groupingId={groupingId}
        groupsSelected={selectedGroups}
        data-test-subj="alerts-table-group-selector"
        onGroupChange={onChange}
        fields={fields}
        maxGroupingLevels={maxGroupingLevels}
        options={options}
        title={title}
        onOpenTracker={onOpenTracker}
        settings={groupSettings}
      />
    );
  }, [
    groupingId,
    selectedGroups,
    onChange,
    fields,
    maxGroupingLevels,
    options,
    title,
    onOpenTracker,
    groupSettings,
  ]);
};
