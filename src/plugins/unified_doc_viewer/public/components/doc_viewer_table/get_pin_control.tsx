/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiDataGridControlColumn,
  EuiScreenReaderOnly,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { TableRow } from './table_cell_actions';

interface PinControlCellProps {
  row: TableRow;
}

const PinControlCell: React.FC<PinControlCellProps> = React.memo(({ row }) => {
  const { euiTheme } = useEuiTheme();

  const fieldName = row.field.field;
  const isPinned = row.field.pinned;
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
      <EuiToolTip content={label} delay="long">
        <EuiButtonIcon
          data-test-subj={`unifiedDocViewer_pinControlButton_${fieldName}`}
          iconSize="m"
          iconType={isPinned ? 'pinFilled' : 'pin'}
          color="text"
          aria-label={label}
          onClick={() => {
            row.field.onTogglePinned(fieldName);
          }}
        />
      </EuiToolTip>
    </div>
  );
});

export const getPinColumnControl = ({ rows }: { rows: TableRow[] }): EuiDataGridControlColumn => {
  return {
    id: 'pin_field',
    width: 32,
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
