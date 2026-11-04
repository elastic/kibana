/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  type EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';

interface FieldsSelectorProps {
  /** All real (non-placeholder) columns available in the index. */
  columns: DatatableColumn[];
  /** Names of the columns currently shown in the grid, in display order. */
  visibleColumns: string[];
  /** Called with the next ordered list of visible column names when the selection changes. */
  onChange: (nextVisibleColumns: string[]) => void;
}

/**
 * Toolbar control that lets users choose which fields are shown in the grid. The grid only renders
 * a capped set of columns by default to stay responsive on indices with many fields, so this is the
 * entry point for revealing the rest.
 */
export const FieldsSelector: React.FC<FieldsSelectorProps> = ({
  columns,
  visibleColumns,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const visibleColumnNames = useMemo(() => new Set(visibleColumns), [visibleColumns]);

  const options = useMemo<EuiSelectableOption[]>(
    () =>
      columns.map((column) => ({
        key: column.name,
        label: column.name,
        checked: visibleColumnNames.has(column.name) ? 'on' : undefined,
      })),
    [columns, visibleColumnNames]
  );

  const handleChange = (nextOptions: EuiSelectableOption[]) => {
    const checkedNames = nextOptions
      .filter((option) => option.checked === 'on')
      .map((option) => option.key as string);

    // Always keep at least one field displayed; ignore a change that would hide them all.
    if (checkedNames.length === 0) {
      return;
    }

    const checkedColumnNames = new Set(checkedNames);

    // Keep the current order of columns that stay visible, then append newly revealed ones in
    // data view order.
    const nextVisibleColumns = [
      ...visibleColumns.filter((name) => checkedColumnNames.has(name)),
      ...checkedNames.filter((name) => !visibleColumnNames.has(name)),
    ];

    onChange(nextVisibleColumns);
  };

  const buttonLabel = i18n.translate('indexEditor.toolbar.fieldsSelector.buttonLabel', {
    defaultMessage: 'Fields ({visibleCount}/{totalCount})',
    values: { visibleCount: visibleColumns.length, totalCount: columns.length },
  });

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      aria-label={i18n.translate('indexEditor.toolbar.fieldsSelector.popoverAriaLabel', {
        defaultMessage: 'Select which fields are shown',
      })}
      button={
        <EuiButtonEmpty
          size="s"
          color="text"
          iconType="listBullet"
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj="indexEditorFieldsSelectorButton"
        >
          {buttonLabel}
        </EuiButtonEmpty>
      }
    >
      <EuiSelectable
        searchable
        searchProps={{
          compressed: true,
          placeholder: i18n.translate('indexEditor.toolbar.fieldsSelector.searchPlaceholder', {
            defaultMessage: 'Search fields',
          }),
          'data-test-subj': 'indexEditorFieldsSelectorSearch',
        }}
        options={options}
        onChange={handleChange}
        height={300}
        listProps={{ isVirtualized: true }}
        data-test-subj="indexEditorFieldsSelectorList"
      >
        {(list, search) => (
          <div css={{ width: 300 }}>
            <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
