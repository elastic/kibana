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
import { EuiPopover } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import type { FieldSpec } from '@kbn/data-views-plugin/common';
import { CustomFieldPanel } from './custom_field_panel';
import * as i18n from '../translations';
import { StyledContextMenu, StyledEuiButtonEmpty } from '../styles';

export interface GroupSelectorProps {
  'data-test-subj'?: string;
  fields: FieldSpec[];
  groupingId: string;
  groupsSelected: string[];
  onGroupChange: (groupSelection: string) => void;
  options: Array<{ key: string; label: string }>;
  title?: string;
  maxGroupingLevels?: number;
}
const GroupSelectorComponent = ({
  'data-test-subj': dataTestSubj,
  fields,
  groupsSelected = ['none'],
  onGroupChange,
  options,
  title = i18n.GROUP_BY,
  maxGroupingLevels = 1,
}: GroupSelectorProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isGroupSelected = useCallback(
    (groupKey: string) =>
      !!groupsSelected.find((selectedGroupKey) => selectedGroupKey === groupKey),
    [groupsSelected]
  );

  const panels: EuiContextMenuPanelDescriptor[] = useMemo(() => {
    const isOptionDisabled = (key?: string) => {
      // Do not disable when maxGroupingLevels is 1 to allow toggling between groups
      if (maxGroupingLevels === 1) {
        return false;
      }
      // Disable all non selected options when the maxGroupingLevels is reached
      return groupsSelected.length === maxGroupingLevels && (key ? !isGroupSelected(key) : true);
    };

    return [
      {
        id: 'firstPanel',
        title:
          maxGroupingLevels === 1 ? i18n.SELECT_SINGLE_FIELD : i18n.SELECT_FIELD(maxGroupingLevels),
        items: [
          {
            'data-test-subj': 'panel-none',
            name: i18n.NONE,
            icon: isGroupSelected('none') ? 'check' : 'empty',
            onClick: () => onGroupChange('none'),
          },
          ...options.map<EuiContextMenuPanelItemDescriptor>((o) => ({
            'data-test-subj': `panel-${o.key}`,
            disabled: isOptionDisabled(o.key),
            name: o.label,
            onClick: () => onGroupChange(o.key),
            icon: isGroupSelected(o.key) ? 'check' : 'empty',
          })),
          {
            'data-test-subj': `panel-custom`,
            name: i18n.CUSTOM_FIELD,
            icon: 'empty',
            disabled: isOptionDisabled(),
            panel: 'customPanel',
            hasPanel: true,
          },
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
  }, [fields, groupsSelected.length, isGroupSelected, maxGroupingLevels, onGroupChange, options]);
  const selectedOptions = useMemo(
    () => options.filter((groupOption) => isGroupSelected(groupOption.key)),
    [isGroupSelected, options]
  );

  const onButtonClick = useCallback(() => setIsPopoverOpen((currentVal) => !currentVal), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const button = useMemo(() => {
    // need to use groupsSelected to ensure proper selection order (selectedOptions does not handle selection order)
    const buttonLabel = isGroupSelected('none')
      ? i18n.NONE
      : groupsSelected.reduce((optionsTitle, o) => {
          const selection = selectedOptions.find((opt) => opt.key === o);
          if (selection == null) {
            return optionsTitle;
          }
          return optionsTitle ? [optionsTitle, selection.label].join(', ') : selection.label;
        }, '');
    return (
      <StyledEuiButtonEmpty
        data-test-subj="group-selector-dropdown"
        flush="both"
        iconSide="right"
        iconSize="s"
        iconType="arrowDown"
        onClick={onButtonClick}
        title={buttonLabel}
        size="xs"
      >
        {`${title}: ${buttonLabel}`}
      </StyledEuiButtonEmpty>
    );
  }, [groupsSelected, isGroupSelected, onButtonClick, selectedOptions, title]);

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
      />
    </EuiPopover>
  );
};

export const GroupSelector = React.memo(GroupSelectorComponent);
