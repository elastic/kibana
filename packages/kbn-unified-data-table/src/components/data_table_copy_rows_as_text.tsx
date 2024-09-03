/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useState } from 'react';
import { uniq } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiContextMenuItem } from '@elastic/eui';
import type { ToastsStart } from '@kbn/core/public';
import { calcFieldCounts } from '@kbn/discover-utils';
import { copyRowsAsTextToClipboard } from '../utils/copy_value_to_clipboard';
import { UnifiedDataTableContext } from '../table_context';

interface DataTableCopyRowsAsTextProps {
  toastNotifications: ToastsStart;
  columns: string[];
  onCompleted: () => void;
}

export const DataTableCopyRowsAsText: React.FC<DataTableCopyRowsAsTextProps> = ({
  toastNotifications,
  columns,
  onCompleted,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { valueToStringConverter, dataView, rows, selectedDocsState } =
    useContext(UnifiedDataTableContext);
  const { isDocSelected } = selectedDocsState;

  return (
    <EuiContextMenuItem
      data-test-subj="unifiedDataTableCopyRowsAsText"
      icon="copyClipboard"
      disabled={isProcessing}
      onClick={async () => {
        setIsProcessing(true);

        const outputColumns = columns.reduce((acc, column) => {
          if (column === '_source') {
            // split Document column into individual columns
            const fieldCounts = calcFieldCounts(rows);
            acc.push(...Object.keys(fieldCounts).sort());
            return acc;
          }
          acc.push(column);
          return acc;
        }, [] as string[]);

        await copyRowsAsTextToClipboard({
          columns: uniq(outputColumns),
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
        setIsProcessing(false);
        onCompleted();
      }}
    >
      <FormattedMessage
        id="unifiedDataTable.copySelectionToClipboard"
        defaultMessage="Copy selection as text"
      />
    </EuiContextMenuItem>
  );
};
