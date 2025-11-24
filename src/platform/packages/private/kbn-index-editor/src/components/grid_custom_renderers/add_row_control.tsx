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
import React, { useCallback } from 'react';
import { type EuiDataGridRefProps } from '@elastic/eui';
import type { IndexUpdateService } from '../../index_update_service';

export const getAddRowControl =
  (indexUpdateService: IndexUpdateService, dataTableRef: RefObject<EuiDataGridRefProps>) =>
  (Control: RowControlComponent, props: RowControlRowProps) => {
    const onAddRow = useCallback(() => {
      indexUpdateService.addEmptyRow(props.rowIndex + 1);

      // Set focus to the new added row's first cell
      setTimeout(() => {
        dataTableRef.current?.setFocusedCell({
          rowIndex: props.rowIndex + 1,
          colIndex: 2, // first data column (skip row control columns)
        });
      }, 100);
    }, [props.rowIndex]);

    return (
      <div className="dataGrid__addRowAction">
        <Control
          color="text"
          iconType="plus"
          label="Add row"
          tooltipContent="Add row"
          onClick={() => onAddRow()}
        />
        {/* <EuiButtonIcon
          color="text"
          display="base"
          iconType="plus"
          size="xs"
          aria-label="Add Row"
          onClick={() => onAddRow()}
          css={{ margin: '0px 4px' }}
        /> */}
      </div>
    );
  };
