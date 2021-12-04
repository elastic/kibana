/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState } from 'react';
import { EuiButtonIcon, EuiListGroup, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IndexPatternField } from '../../../../../../../data/public';
import { DocViewFilterFn } from '../../../doc_views_types';
import { FilterAdd } from './filter_add';
import { FilterExists } from './filter_exists';
import { FilterRemove } from './filter_remove';
import { ToggleColumn } from './toggle_column';
import { PinField } from './pin_field';

interface TableActionsProps {
  field: string;
  pinned: boolean;
  isActive: boolean;
  flattenedField: unknown;
  fieldMapping?: IndexPatternField;
  onFilter: DocViewFilterFn;
  onToggleColumn: (field: string) => void;
  ignoredValue: boolean;
  onTogglePinned: (field: string) => void;
}

export const TableActions = ({
  pinned,
  isActive,
  field,
  fieldMapping,
  flattenedField,
  onToggleColumn,
  onFilter,
  ignoredValue,
  onTogglePinned,
}: TableActionsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const pinFieldLabel = i18n.translate('discover.docView.table.actions.open', {
    defaultMessage: 'Open actions',
  });

  const openPopover = useCallback(() => setIsOpen(true), [setIsOpen]);
  const closePopover = useCallback(() => setIsOpen(false), [setIsOpen]);
  const togglePinned = useCallback(() => onTogglePinned(field), [field, onTogglePinned]);
  const onClickAction = useCallback(
    (callback: () => void) => () => {
      callback();
      closePopover();
    },
    [closePopover]
  );

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          data-test-subj={`openFieldActionsButton-${field}`}
          aria-label={pinFieldLabel}
          onClick={openPopover}
          iconType="boxesHorizontal"
          color="text"
        />
      }
      isOpen={isOpen}
      closePopover={closePopover}
      display="block"
      panelPaddingSize="s"
    >
      <EuiListGroup maxWidth={200} flush={true} size="s">
        <FilterAdd
          disabled={!fieldMapping || !fieldMapping.filterable || ignoredValue}
          onClick={onClickAction(onFilter.bind({}, fieldMapping, flattenedField, '+'))}
        />

        <FilterRemove
          disabled={!fieldMapping || !fieldMapping.filterable || ignoredValue}
          onClick={onClickAction(onFilter.bind({}, fieldMapping, flattenedField, '-'))}
        />

        <ToggleColumn
          active={isActive}
          fieldname={field}
          onClick={onClickAction(onToggleColumn.bind({}, field))}
        />

        <FilterExists
          scripted={fieldMapping && fieldMapping.scripted}
          disabled={!fieldMapping || !fieldMapping.filterable}
          onClick={onClickAction(onFilter.bind({}, fieldMapping, flattenedField, '-'))}
        />

        <PinField pinned={pinned} onClick={onClickAction(togglePinned)} />
      </EuiListGroup>
    </EuiPopover>
  );
};
