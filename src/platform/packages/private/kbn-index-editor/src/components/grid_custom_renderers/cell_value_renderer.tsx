/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FunctionComponent, RefObject } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { type EuiDataGridRefProps } from '@kbn/unified-data-table';
import { type DataGridCellValueElementProps } from '@kbn/unified-data-table';
import type { DataTableRecord } from '@kbn/discover-utils';
import { isNil } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PendingSave } from '../../index_update_service';

export const getCellValueRenderer =
  (
    rows: DataTableRecord[],
    savingDocs: PendingSave | undefined,
    dataTableRef: RefObject<EuiDataGridRefProps>,
    isIndexCreated: boolean
  ): FunctionComponent<DataGridCellValueElementProps> =>
  ({ rowIndex, colIndex, columnId }) => {
    const row = rows[rowIndex];
    const docId = row.raw._id as string;

    const pendingSaveValue = savingDocs?.get(docId)?.[columnId];

    let cellValue;

    const isPendingToBeSaved = !isNil(pendingSaveValue);

    if (isPendingToBeSaved) {
      // If there is a pending save, use the value from the pending save
      cellValue = pendingSaveValue;
    } else if (row.flattened) {
      // Otherwise, use the value from the row
      cellValue = row.flattened[columnId]?.toString();
    }

    const onEditStartHandler = () => {
      dataTableRef.current?.openCellPopover({
        rowIndex,
        colIndex,
      });
    };

    return (
      <EuiFlexGroup gutterSize="s" responsive={false} style={{ height: '100%', width: '100%' }}>
        <EuiFlexItem>
          <div
            css={{
              cursor: 'pointer',
              height: '100%',
              width: '100%',
            }}
            onClick={onEditStartHandler}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onEditStartHandler();
            }}
          >
            {
              // Only check for undefined, other falsy values might be user inputs
              cellValue === undefined ? (
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="indexEditor.flyout.grid.cell.default"
                    defaultMessage="Add value…"
                  />
                </EuiText>
              ) : (
                `${cellValue}`
              )
            }
          </div>
        </EuiFlexItem>
        {isPendingToBeSaved && isIndexCreated ? (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  };
