/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiContextMenuItem } from '@elastic/eui';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import { copyRowsAsTextToClipboard } from '../utils/copy_value_to_clipboard';
import { UnifiedDataTableContext } from '../table_context';

interface DataTableCopyRowsAsTextProps {
  toastNotifications: ToastsStart;
  columns: string[];
}

export const DataTableCopyRowsAsText: React.FC<DataTableCopyRowsAsTextProps> = ({
  toastNotifications,
  columns,
}) => {
  const { valueToStringConverter, dataView, rows, selectedDocsState } =
    useContext(UnifiedDataTableContext);
  const { isDocSelected } = selectedDocsState;

  return (
    <EuiContextMenuItem
      data-test-subj="unifiedDataTableCopyRowsAsText"
      icon="copyClipboard"
      onClick={async () => {
        await copyRowsAsTextToClipboard({
          columns,
          // preserving the original order of rows rather than the order of selecting rows
          selectedRowIndices: rows.reduce((acc, row, index) => {
            if (isDocSelected(row.id)) {
              acc.push(index);
            }
            return acc;
          }, [] as number[]),
          valueToStringConverter,
          toastNotifications,
          dataView,
        });
      }}
    >
      <FormattedMessage
        id="unifiedDataTable.copySelectionToClipboard"
        defaultMessage="Copy selection to clipboard"
      />
    </EuiContextMenuItem>
  );
};
