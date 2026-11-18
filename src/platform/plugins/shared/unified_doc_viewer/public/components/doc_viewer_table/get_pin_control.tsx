/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonIcon, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { FieldRow } from './field_row';
import type { TableGridCellAddress, TableGridControlColumn } from './table_grid/model';

interface PinControlCellProps {
  row: FieldRow;
  columnId: string;
  onTogglePinned: (fieldName: string) => void;
  requestFocus: (address: TableGridCellAddress) => void;
}

const PinControlCell: React.FC<PinControlCellProps> = React.memo(
  ({ row, columnId, onTogglePinned, requestFocus }) => {
    const { euiTheme } = useEuiTheme();

    const fieldName = row.name;
    const isPinned = row.isPinned;
    const label = isPinned
      ? i18n.translate('unifiedDocViewer.docViews.table.unpinFieldLabel', {
          defaultMessage: 'Unpin field',
        })
      : i18n.translate('unifiedDocViewer.docViews.table.pinFieldLabel', {
          defaultMessage: 'Pin field',
        });

    return (
      <div
        data-test-subj={`unifiedDocViewer_pinControl_${fieldName}`}
        className={!isPinned ? 'kbnDocViewer__fieldsGrid__pinAction' : undefined}
        css={css`
          margin-left: ${isPinned ? '-1px' : 0}; // to align filled/unfilled pin icons better
          width: ${euiTheme.size.l};
          height: ${euiTheme.size.l};
          overflow: hidden;
        `}
      >
        <EuiToolTip content={label} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj={`unifiedDocViewer_pinControlButton_${fieldName}`}
            iconSize="m"
            iconType={isPinned ? 'pinFill' : 'pin'}
            color="text"
            aria-label={label}
            onClick={(event: { detail: number }) => {
              onTogglePinned(fieldName);
              if (event.detail === 0) {
                requestFocus({ rowId: row.name, columnId });
              }
            }}
          />
        </EuiToolTip>
      </div>
    );
  }
);

export const getPinColumnControl = ({
  onTogglePinned,
}: {
  onTogglePinned: (fieldName: string) => void;
}): TableGridControlColumn<FieldRow> => {
  const pinColumnHeader = i18n.translate('unifiedDocViewer.fieldsTable.pinControlColumnHeader', {
    defaultMessage: 'Pin field column',
  });

  return {
    id: 'pin_field',
    label: pinColumnHeader,
    width: 32,
    renderCell: ({ row, columnId, requestFocus }) => {
      return (
        <PinControlCell
          key={`control-${row.name}`}
          row={row}
          columnId={columnId}
          onTogglePinned={onTogglePinned}
          requestFocus={requestFocus}
        />
      );
    },
  };
};
