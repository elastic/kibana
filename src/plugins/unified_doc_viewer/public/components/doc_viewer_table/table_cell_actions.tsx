/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';

interface TableActionsProps {
  mode?: 'inline' | 'as_popover';
  field: string;
  pinned: boolean;
  flattenedField: unknown;
  fieldMapping?: DataViewField;
  onFilter?: DocViewFilterFn;
  onToggleColumn: (field: string) => void;
  ignoredValue: boolean;
  onTogglePinned: (field: string) => void;
}

interface PanelItem {
  name: string;
  'aria-label': string;
  toolTipContent?: string;
  disabled?: boolean;
  'data-test-subj': string;
  icon: string;
  onClick: () => void;
}

export const TableActions = ({
  mode = 'as_popover',
  pinned,
  field,
  fieldMapping,
  flattenedField,
  onToggleColumn,
  onFilter,
  ignoredValue,
  onTogglePinned,
}: TableActionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const openActionsLabel = i18n.translate('unifiedDocViewer.docView.table.actions.open', {
    defaultMessage: 'Open actions',
  });
  const actionsLabel = i18n.translate('unifiedDocViewer.docView.table.actions.label', {
    defaultMessage: 'Actions',
  });

  // Filters pair
  const filtersPairDisabled = !fieldMapping || !fieldMapping.filterable || ignoredValue;
  const filterAddLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterForValueButtonTooltip',
    {
      defaultMessage: 'Filter for value',
    }
  );
  const filterAddAriaLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterForValueButtonAriaLabel',
    { defaultMessage: 'Filter for value' }
  );
  const filterOutLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterOutValueButtonTooltip',
    {
      defaultMessage: 'Filter out value',
    }
  );
  const filterOutAriaLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterOutValueButtonAriaLabel',
    { defaultMessage: 'Filter out value' }
  );
  const filtersPairToolTip =
    (filtersPairDisabled &&
      i18n.translate('unifiedDocViewer.docViews.table.unindexedFieldsCanNotBeSearchedTooltip', {
        defaultMessage: 'Unindexed fields or ignored values cannot be searched',
      })) ||
    undefined;

  // Filter exists
  const filterExistsLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterForFieldPresentButtonTooltip',
    { defaultMessage: 'Filter for field present' }
  );
  const filterExistsAriaLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.filterForFieldPresentButtonAriaLabel',
    { defaultMessage: 'Filter for field present' }
  );
  const filtersExistsDisabled = !fieldMapping || !fieldMapping.filterable;
  const filtersExistsToolTip =
    (filtersExistsDisabled &&
      (fieldMapping && fieldMapping.scripted
        ? i18n.translate(
            'unifiedDocViewer.docViews.table.unableToFilterForPresenceOfScriptedFieldsTooltip',
            {
              defaultMessage: 'Unable to filter for presence of scripted fields',
            }
          )
        : i18n.translate(
            'unifiedDocViewer.docViews.table.unableToFilterForPresenceOfMetaFieldsTooltip',
            {
              defaultMessage: 'Unable to filter for presence of meta fields',
            }
          ))) ||
    undefined;

  // Toggle columns
  const toggleColumnsLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.toggleColumnInTableButtonTooltip',
    { defaultMessage: 'Toggle column in table' }
  );
  const toggleColumnsAriaLabel = i18n.translate(
    'unifiedDocViewer.docViews.table.toggleColumnInTableButtonAriaLabel',
    { defaultMessage: 'Toggle column in table' }
  );

  // Pinned
  const pinnedLabel = pinned
    ? i18n.translate('unifiedDocViewer.docViews.table.unpinFieldLabel', {
        defaultMessage: 'Unpin field',
      })
    : i18n.translate('unifiedDocViewer.docViews.table.pinFieldLabel', {
        defaultMessage: 'Pin field',
      });
  const pinnedAriaLabel = pinned
    ? i18n.translate('unifiedDocViewer.docViews.table.unpinFieldAriaLabel', {
        defaultMessage: 'Unpin field',
      })
    : i18n.translate('unifiedDocViewer.docViews.table.pinFieldAriaLabel', {
        defaultMessage: 'Pin field',
      });
  const pinnedIconType = pinned ? 'pinFilled' : 'pin';

  const toggleOpenPopover = useCallback(() => setIsOpen((current) => !current), []);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePinned = useCallback(() => onTogglePinned(field), [field, onTogglePinned]);
  const onClickAction = useCallback(
    (callback: () => void) => () => {
      callback();
      closePopover();
    },
    [closePopover]
  );

  let panelItems: PanelItem[] = [
    {
      name: toggleColumnsLabel,
      'aria-label': toggleColumnsAriaLabel,
      'data-test-subj': `toggleColumnButton-${field}`,
      icon: 'listAdd',
      onClick: onClickAction(onToggleColumn.bind({}, field)),
    },
    {
      name: pinnedLabel,
      'aria-label': pinnedAriaLabel,
      icon: pinnedIconType,
      'data-test-subj': `togglePinFilterButton-${field}`,
      onClick: onClickAction(togglePinned),
    },
  ];

  if (onFilter) {
    panelItems = [
      {
        name: filterAddLabel,
        'aria-label': filterAddAriaLabel,
        toolTipContent: filtersPairToolTip,
        icon: 'plusInCircle',
        disabled: filtersPairDisabled,
        'data-test-subj': `addFilterForValueButton-${field}`,
        onClick: onClickAction(onFilter.bind({}, fieldMapping, flattenedField, '+')),
      },
      {
        name: filterOutLabel,
        'aria-label': filterOutAriaLabel,
        toolTipContent: filtersPairToolTip,
        icon: 'minusInCircle',
        disabled: filtersPairDisabled,
        'data-test-subj': `addFilterOutValueButton-${field}`,
        onClick: onClickAction(onFilter.bind({}, fieldMapping, flattenedField, '-')),
      },
      {
        name: filterExistsLabel,
        'aria-label': filterExistsAriaLabel,
        toolTipContent: filtersExistsToolTip,
        icon: 'filter',
        disabled: filtersExistsDisabled,
        'data-test-subj': `addExistsFilterButton-${field}`,
        onClick: onClickAction(onFilter.bind({}, '_exists_', field, '+')),
      },
      ...panelItems,
    ];
  }

  const panels = [
    {
      id: 0,
      title: actionsLabel,
      items: panelItems,
    },
  ];

  if (mode === 'inline') {
    return (
      <EuiFlexGroup
        responsive={false}
        gutterSize="xs"
        className="kbnDocViewer__buttons"
        data-test-subj={`fieldActionsGroup-${field}`}
      >
        {panels[0].items.map((item) => (
          <EuiFlexItem key={item.icon} grow={false}>
            <EuiToolTip content={item.name}>
              <EuiButtonIcon
                className="kbnDocViewer__actionButton"
                data-test-subj={item['data-test-subj']}
                aria-label={item['aria-label']}
                iconType={item.icon}
                iconSize="s"
                disabled={item.disabled}
                onClick={item.onClick}
              />
            </EuiToolTip>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          data-test-subj={`openFieldActionsButton-${field}`}
          aria-label={openActionsLabel}
          onClick={toggleOpenPopover}
          iconType="boxesHorizontal"
          color="text"
        />
      }
      isOpen={isOpen}
      closePopover={closePopover}
      display="block"
      panelPaddingSize="none"
    >
      <EuiContextMenu initialPanelId={0} size="s" panels={panels} />
    </EuiPopover>
  );
};
