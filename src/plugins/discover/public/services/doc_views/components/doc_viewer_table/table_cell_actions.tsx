/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiContextMenu, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataViewField } from '../../../../../../data_views/public';
import { DocViewFilterFn } from '../../doc_views_types';

interface TableActionsProps {
  field: string;
  pinned: boolean;
  flattenedField: unknown;
  fieldMapping?: DataViewField;
  onFilter: DocViewFilterFn;
  onToggleColumn: (field: string) => void;
  ignoredValue: boolean;
  onTogglePinned: (field: string) => void;
}

export const TableActions = ({
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
  const openActionsLabel = i18n.translate('discover.docView.table.actions.open', {
    defaultMessage: 'Open actions',
  });
  const actionsLabel = i18n.translate('discover.docView.table.actions.label', {
    defaultMessage: 'Actions',
  });

  // Filters pair
  const filtersPairDisabled = !fieldMapping || !fieldMapping.filterable || ignoredValue;
  const filterAddLabel = i18n.translate('discover.docViews.table.filterForValueButtonTooltip', {
    defaultMessage: 'Filter for value',
  });
  const filterAddAriaLabel = i18n.translate(
    'discover.docViews.table.filterForValueButtonAriaLabel',
    { defaultMessage: 'Filter for value' }
  );
  const filterOutLabel = i18n.translate('discover.docViews.table.filterOutValueButtonTooltip', {
    defaultMessage: 'Filter out value',
  });
  const filterOutAriaLabel = i18n.translate(
    'discover.docViews.table.filterOutValueButtonAriaLabel',
    { defaultMessage: 'Filter out value' }
  );
  const filtersPairToolTip =
    (filtersPairDisabled &&
      i18n.translate('discover.docViews.table.unindexedFieldsCanNotBeSearchedTooltip', {
        defaultMessage: 'Unindexed fields or ignored values cannot be searched',
      })) ||
    undefined;

  // Filter exists
  const filterExistsLabel = i18n.translate(
    'discover.docViews.table.filterForFieldPresentButtonTooltip',
    { defaultMessage: 'Filter for field present' }
  );
  const filterExistsAriaLabel = i18n.translate(
    'discover.docViews.table.filterForFieldPresentButtonAriaLabel',
    { defaultMessage: 'Filter for field present' }
  );
  const filtersExistsDisabled = !fieldMapping || !fieldMapping.filterable;
  const filtersExistsToolTip =
    (filtersExistsDisabled &&
      (fieldMapping && fieldMapping.scripted
        ? i18n.translate(
            'discover.docViews.table.unableToFilterForPresenceOfScriptedFieldsTooltip',
            {
              defaultMessage: 'Unable to filter for presence of scripted fields',
            }
          )
        : i18n.translate('discover.docViews.table.unableToFilterForPresenceOfMetaFieldsTooltip', {
            defaultMessage: 'Unable to filter for presence of meta fields',
          }))) ||
    undefined;

  // Toggle columns
  const toggleColumnsLabel = i18n.translate(
    'discover.docViews.table.toggleColumnInTableButtonTooltip',
    { defaultMessage: 'Toggle column in table' }
  );
  const toggleColumnsAriaLabel = i18n.translate(
    'discover.docViews.table.toggleColumnInTableButtonAriaLabel',
    { defaultMessage: 'Toggle column in table' }
  );

  // Pinned
  const pinnedLabel = pinned
    ? i18n.translate('discover.docViews.table.unpinFieldLabel', { defaultMessage: 'Unpin field' })
    : i18n.translate('discover.docViews.table.pinFieldLabel', { defaultMessage: 'Pin field' });
  const pinnedAriaLabel = pinned
    ? i18n.translate('discover.docViews.table.unpinFieldAriaLabel', {
        defaultMessage: 'Unpin field',
      })
    : i18n.translate('discover.docViews.table.pinFieldAriaLabel', { defaultMessage: 'Pin field' });
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

  const panels = [
    {
      id: 0,
      title: actionsLabel,
      items: [
        {
          name: filterAddLabel,
          'aria-label': filterAddAriaLabel,
          toolTipContent: filtersPairToolTip,
          icon: 'plusInCircle',
          disabled: filtersPairDisabled,
          onClick: onClickAction(onFilter.bind({}, fieldMapping, flattenedField, '+')),
        },
        {
          name: filterOutLabel,
          'aria-label': filterOutAriaLabel,
          toolTipContent: filtersPairToolTip,
          icon: 'minusInCircle',
          disabled: filtersPairDisabled,
          onClick: onClickAction(onFilter.bind({}, fieldMapping, flattenedField, '-')),
        },
        {
          name: filterExistsLabel,
          'aria-label': filterExistsAriaLabel,
          toolTipContent: filtersExistsToolTip,
          icon: 'filter',
          disabled: filtersExistsDisabled,
          onClick: onClickAction(onFilter.bind({}, fieldMapping, flattenedField, '-')),
        },
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
          onClick: onClickAction(togglePinned),
        },
      ],
    },
  ];

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
