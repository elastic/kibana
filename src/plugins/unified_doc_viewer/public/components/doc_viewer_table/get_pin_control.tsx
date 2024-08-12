/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiDataGridControlColumn,
  EuiScreenReaderOnly,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TableRow } from './table_cell_actions';

interface PinControlCellProps {
  row: TableRow;
}

const PinControlCell: React.FC<PinControlCellProps> = React.memo(({ row }) => {
  const label = row.field.pinned
    ? i18n.translate('unifiedDocViewer.fieldsTable.unpinControlAriaLabel', {
        defaultMessage: 'Unpin field',
      })
    : i18n.translate('unifiedDocViewer.fieldsTable.pinControlAriaLabel', {
        defaultMessage: 'Pin field',
      });

  return (
    <EuiToolTip content={label} delay="long">
      <EuiButtonIcon
        data-test-subj="unifiedDocViewer_pinControl"
        iconSize="m"
        iconType={row.field.pinned ? 'pinFilled' : 'pin'}
        color="text"
        aria-label={label}
        onClick={() => {
          row.field.onTogglePinned(row.field.field);
        }}
      />
    </EuiToolTip>
  );
});

export const getPinColumnControl = ({ rows }: { rows: TableRow[] }): EuiDataGridControlColumn => {
  return {
    id: 'pin_field',
    width: 24,
    headerCellRender: () => (
      <EuiScreenReaderOnly>
        <span>
          {i18n.translate('unifiedDocViewer.fieldsTable.pinControlColumnHeader', {
            defaultMessage: 'Pin field column',
          })}
        </span>
      </EuiScreenReaderOnly>
    ),
    rowCellRender: ({ rowIndex }) => {
      const row = rows[rowIndex];
      if (!row) {
        return null;
      }
      return <PinControlCell key={`control-${row.field.field}`} row={row} />;
    },
  };
};
