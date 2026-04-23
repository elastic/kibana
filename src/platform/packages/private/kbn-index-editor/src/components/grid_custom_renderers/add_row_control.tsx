/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RowControlComponent, RowControlRowProps } from '@kbn/discover-utils';
import type { RefObject } from 'react';
import React from 'react';
import { EuiButtonIcon, EuiToolTip, type EuiDataGridRefProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IndexUpdateService } from '../../services/index_update_service';

const addRowText = i18n.translate('indexEditor.dataGrid.addRow', {
  defaultMessage: 'Add Row',
});

export const getAddRowControl = (
  indexUpdateService: IndexUpdateService,
  dataTableRef: RefObject<EuiDataGridRefProps>
) => ({
  id: 'addRowControl',
  width: 40,
  render: (Control: RowControlComponent, props: RowControlRowProps) => {
    const refocusAddControl = () => {
      requestAnimationFrame(() => {
        // Need to focus another cell first to ensure the add control can be focused again
        dataTableRef.current?.setFocusedCell({
          rowIndex: props.rowIndex,
          colIndex: 0,
        });
        dataTableRef.current?.setFocusedCell({
          rowIndex: props.rowIndex,
          colIndex: 1,
        });
      });
    };
    const onAddRow = () => {
      indexUpdateService.addEmptyRow(props.rowIndex + 1);
      refocusAddControl();
    };

    return (
      <div className="dataGrid__addRowAction">
        {
          <EuiToolTip content={addRowText} disableScreenReaderOutput>
            <EuiButtonIcon
              color="text"
              display="base"
              iconType="plus"
              size="xs"
              aria-label={addRowText}
              data-test-subj="indexEditorAddRowButton"
              onClick={() => onAddRow()}
              onKeyDown={(e: React.KeyboardEvent) => {
                // Focus back to the cell when pressing Escape
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  refocusAddControl();
                }
              }}
            />
          </EuiToolTip>
        }
      </div>
    );
  },
});
