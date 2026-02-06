/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { useEuiTheme, EuiButtonEmpty } from '@elastic/eui';
import { EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { UiCounterMetricType } from '@kbn/analytics';
import { METRIC_TYPE } from '@kbn/analytics';
import { CustomFieldPanel } from './custom_field_panel';
import * as i18n from '../translations';
import { StyledContextMenu } from '../styles';
import type { GroupSettings } from '../../hooks/types';
import { NONE_GROUP_KEY } from '../types';

/**
 * Checks if a group is enforced
 * @param groupKey - Group key to check
 * @param enforcedGroups - Array of enforced group keys
 * @returns True if the group is enforced, false otherwise
 */
const isEnforcedGroup = (groupKey?: string, enforcedGroups?: string[]) =>
  Boolean(groupKey && enforcedGroups?.includes(groupKey));

/**
 * Checks if 'none' option should be disabled
 * 'none' should be disabled when only enforced groups are selected
 * @param enforcedGroups - Array of enforced group keys
 * @param selectedGroups - Array of selected group keys
 * @returns True if 'none' should be disabled, false otherwise
 */
const shouldDisableNone = ({
  enforcedGroups,
  selectedGroups,
}: {
  enforcedGroups?: string[];
  selectedGroups: string[];
}) => {
  if (!enforcedGroups || enforcedGroups.length === 0) {
    return false;
  }
  // Check if only enforced groups are selected
  return (
    selectedGroups.length === enforcedGroups.length &&
    selectedGroups.every((g) => enforcedGroups.includes(g))
  );
};

export interface GroupSelectorProps {
  'data-test-subj'?: string;
  fields: FieldSpec[];
  groupingId: string;
  groupsSelected: string[];
  onGroupChange: (groupSelection: string) => void;
  options: Array<{ key: string; label: string }>;
  title?: string;
  maxGroupingLevels?: number;
  onOpenTracker?: (
    type: UiCounterMetricType,
    event: string | string[],
    count?: number | undefined
  ) => void;
  settings?: GroupSettings;
}
const GroupSelectorComponent = ({
  'data-test-subj': dataTestSubj,
  fields,
  groupsSelected = ['none'],
  onGroupChange,
  options,
  title = i18n.GROUP_BY,
  maxGroupingLevels = 1,
  onOpenTracker,
  settings,
}: GroupSelectorProps) => {
  const {
    hideNoneOption,
    hideCustomFieldOption,
    hideOptionsTitle,
    popoverButtonLabel,
    enforcedGroups,
  } = settings ?? {};
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isGroupSelected = useCallback(
    (groupKey: string) =>
      !!groupsSelected.find((selectedGroupKey) => selectedGroupKey === groupKey),
    [groupsSelected]
  );

  const { euiTheme } = useEuiTheme();

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
    const isOptionDisabled = (key?: string) => {
      // If the group is enforced, always disable it to prevent deselection (takes precedence)
      // Note: Validation prevents enforced groups when maxGroupingLevels === 1, so this check
      // will never conflict with toggle mode
      if (isEnforcedGroup(key, enforcedGroups)) {
        return true;
      }

      // Do not disable when maxGroupingLevels is 1 to allow toggling (applies to all options)
      if (maxGroupingLevels === 1) {
        return false;
      }

      if (!key) {
        // Custom field option
        // Disable all non selected options when the maxGroupingLevels is reached
        return groupsSelected.length === maxGroupingLevels;
      }

      // Disable all non selected options when the maxGroupingLevels is reached
      return groupsSelected.length === maxGroupingLevels && !isGroupSelected(key);
    };

    const topLevelTitle =
      maxGroupingLevels === 1 ? i18n.SELECT_SINGLE_FIELD : i18n.SELECT_FIELD(maxGroupingLevels);

    return [
      {
        id: 'firstPanel',
        title: hideOptionsTitle ? null : topLevelTitle,
        items: [
          ...(hideNoneOption
            ? []
            : [
                {
                  'data-test-subj': 'panel-none',
                  name: i18n.NONE,
                  icon: isGroupSelected(NONE_GROUP_KEY) ? 'check' : 'empty',
                  disabled: shouldDisableNone({ enforcedGroups, selectedGroups: groupsSelected }),
                  onClick: () => onGroupChange(NONE_GROUP_KEY),
                } as EuiContextMenuPanelItemDescriptor,
              ]),
          ...options.map<EuiContextMenuPanelItemDescriptor>((o) => ({
            'data-test-subj': `panel-${o.key}`,
            disabled: isOptionDisabled(o.key),
            name: o.label,
            onClick: () => onGroupChange(o.key),
            icon: isGroupSelected(o.key) ? 'check' : 'empty',
          })),
          ...(hideCustomFieldOption
            ? []
            : [
                {
                  'data-test-subj': `panel-custom`,
                  name: i18n.CUSTOM_FIELD,
                  icon: 'empty',
                  disabled: isOptionDisabled(),
                  panel: 'customPanel',
                  hasPanel: true,
                } as EuiContextMenuPanelItemDescriptor,
              ]),
        ],
      },
      {
        id: 'customPanel',
        title: i18n.GROUP_BY_CUSTOM_FIELD,
        width: 685,
        content: (
          <CustomFieldPanel
            currentOptions={options.map((o) => ({ text: o.label, field: o.key }))}
            onSubmit={(field: string) => {
              onGroupChange(field);
              setIsPopoverOpen(false);
            }}
            fields={fields}
          />
        ),
      },
    ];
  }, [
    fields,
    isGroupSelected,
    maxGroupingLevels,
    onGroupChange,
    options,
    hideNoneOption,
    hideCustomFieldOption,
    hideOptionsTitle,
    enforcedGroups,
    groupsSelected,
  ]);
  const selectedOptions = useMemo(
    () => options.filter((groupOption) => isGroupSelected(groupOption.key)),
    [isGroupSelected, options]
  );

  const onButtonClick = useCallback(() => {
    setIsPopoverOpen((currentVal) => {
      const nextVal = !currentVal;
      // Only tracks opening of Group by popup menu, not closing it
      if (nextVal && onOpenTracker) {
        onOpenTracker(METRIC_TYPE.CLICK, 'group_by_opened');
      }
      return nextVal;
    });
  }, [onOpenTracker]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = useMemo(() => {
    // need to use groupsSelected to ensure proper selection order (selectedOptions does not handle selection order)
    const buttonLabel = isGroupSelected(NONE_GROUP_KEY)
      ? i18n.NONE
      : groupsSelected.reduce((optionsTitle, o) => {
          const selection = selectedOptions.find((opt) => opt.key === o);
          if (selection == null) {
            return optionsTitle;
          }
          return optionsTitle ? [optionsTitle, selection.label].join(', ') : selection.label;
        }, '');
    return (
      <EuiButtonEmpty
        data-test-subj="group-selector-dropdown"
        flush="both"
        iconSide="right"
        iconSize="s"
        iconType="arrowDown"
        onClick={onButtonClick}
        title={buttonLabel}
        size="xs"
      >
        {popoverButtonLabel ?? `${title}: ${buttonLabel}`}
      </EuiButtonEmpty>
    );
  }, [groupsSelected, isGroupSelected, onButtonClick, selectedOptions, title, popoverButtonLabel]);

  return (
    <EuiPopover
      data-test-subj={dataTestSubj ?? 'groupByPopover'}
      button={button}
      closePopover={closePopover}
      isOpen={isPopoverOpen}
      panelPaddingSize="none"
    >
      <StyledContextMenu
        data-test-subj="groupByContextMenu"
        initialPanelId="firstPanel"
        panels={panels}
        border={euiTheme.border}
      />
    </EuiPopover>
  );
};

export const GroupSelector = React.memo(GroupSelectorComponent);
