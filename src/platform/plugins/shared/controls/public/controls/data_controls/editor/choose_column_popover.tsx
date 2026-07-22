/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiSelectable } from '@elastic/eui';
import type { ESQLColumn } from '@kbn/es-types';
import { DataControlEditorStrings } from '../data_control_constants';

export function useChooseColumnPopover({
  columns,
  updateQuery,
}: {
  columns: ESQLColumn[];
  updateQuery: (column: string) => void;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [options, setOptions] = useState<EuiSelectableOption[]>(
    columns.map((column) => ({ label: column.name }))
  );

  const onButtonClick = () => setIsPopoverOpen((status) => !status);
  const closePopover = () => setIsPopoverOpen(false);

  const onColumnChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      setOptions(newOptions);

      const selectedColumn = newOptions.find((option) => option.checked === 'on');
      if (selectedColumn) {
        updateQuery(selectedColumn.label);
      }
    },
    [updateQuery]
  );

  const buttonProps = {
    children:
      DataControlEditorStrings.manageControl.dataSource.valuesPreview.getSelectAColumnText(),
    'data-test-subj': 'chooseColumnBtn',
    onClick: onButtonClick,
    popoverProps: {
      'aria-label':
        DataControlEditorStrings.manageControl.dataSource.valuesPreview.getColumnsListLabel(),
      isOpen: isPopoverOpen,
      closePopover,
      children: (
        <EuiSelectable
          aria-label={DataControlEditorStrings.manageControl.dataSource.valuesPreview.getSelectAColumnText()}
          searchable
          searchProps={{
            'data-test-subj': 'selectableColumnSearch',
          }}
          listProps={{
            'data-test-subj': 'selectableColumnList',
          }}
          singleSelection="always"
          options={options}
          onChange={onColumnChange}
          data-test-subj="selectableColumnContainer"
        >
          {(list, search) => (
            <>
              {search}
              {list}
            </>
          )}
        </EuiSelectable>
      ),
    },
  };

  return { buttonProps };
}
