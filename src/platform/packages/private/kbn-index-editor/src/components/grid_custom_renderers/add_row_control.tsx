/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';
import React from 'react';
import type { EuiDataGridControlColumn } from '@elastic/eui';
import { EuiButtonIcon, EuiToolTip, type EuiDataGridRefProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IndexUpdateService } from '../../index_update_service';

const addRowText = i18n.translate('indexEditor.dataGrid.addRow', {
  defaultMessage: 'Add Row',
});

export const getAddRowControl = (
  indexUpdateService: IndexUpdateService,
  dataTableRef: RefObject<EuiDataGridRefProps>
): EuiDataGridControlColumn => ({
  id: 'add-row',
  width: 40,
  headerCellRender: () => <div />,
  rowCellRender: (props) => {
    const onAddRow = () => {
      indexUpdateService.addEmptyRow(props.rowIndex + 1);

      // Set focus to the new added row's first cell
      setTimeout(() => {
        dataTableRef.current?.setFocusedCell({
          rowIndex: props.rowIndex + 1,
          colIndex: 2, // first data column (skip row control columns)
        });
      }, 100);
    };

    return (
      <div className="dataGrid__addRowAction">
        <EuiToolTip content={addRowText} disableScreenReaderOutput>
          <EuiButtonIcon
            color="text"
            display="base"
            iconType="plus"
            size="xs"
            aria-label={addRowText}
            onClick={onAddRow}
          />
        </EuiToolTip>
      </div>
    );
  },
});
