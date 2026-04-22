/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext, useState } from 'react';
import { uniq } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiContextMenuItem } from '@elastic/eui';
import type { ToastsStart } from '@kbn/core/public';
import type { DataTableRecord } from '@kbn/discover-utils';
import { calcFieldCounts } from '@kbn/discover-utils';
import { copyRowsAsTextToClipboard, CopyAsTextFormat } from '../utils/copy_value_to_clipboard';
import { SOURCE_COLUMN } from '../utils/columns';
import { UnifiedDataTableContext } from '../table_context';

interface DataTableCopyRowsAsTextProps {
  format: CopyAsTextFormat;
  rows: DataTableRecord[];
  toastNotifications: ToastsStart;
  columns: string[];
  onCompleted: () => void;
}

export const DataTableCopyRowsAsText: React.FC<DataTableCopyRowsAsTextProps> = ({
  format,
  rows,
  toastNotifications,
  columns,
  onCompleted,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { valueToStringConverter, dataView, selectedDocsState } =
    useContext(UnifiedDataTableContext);
  const { isDocSelected } = selectedDocsState;

  return (
    <EuiContextMenuItem
      data-test-subj={
        format === CopyAsTextFormat.markdown
          ? 'unifiedDataTableCopyRowsAsMarkdown'
          : 'unifiedDataTableCopyRowsAsText'
      }
      icon="copy"
      disabled={isProcessing}
      onClick={async () => {
        setIsProcessing(true);

        const sourceInnerKeys = rows.flatMap(({ flattened }) => {
          const source = flattened?.[SOURCE_COLUMN];
          return source && typeof source === 'object' ? Object.keys(source) : [];
        });
        const documentFields = uniq([...Object.keys(calcFieldCounts(rows)), ...sourceInnerKeys])
          .filter((key) => key !== SOURCE_COLUMN)
          .sort();
        const outputColumns = uniq(
          columns.flatMap((column) => (column === SOURCE_COLUMN ? documentFields : [column]))
        ).sort();

        const selectedRowIndices = rows
          .map((row, index) => (isDocSelected(row.id) ? index : -1))
          .filter((index) => index !== -1);

        await copyRowsAsTextToClipboard({
          format,
          columns: outputColumns,
          selectedRowIndices,
          valueToStringConverter,
          toastNotifications,
          dataView,
        });
        setIsProcessing(false);
        onCompleted();
      }}
    >
      {format === CopyAsTextFormat.markdown ? (
        <FormattedMessage
          id="unifiedDataTable.copySelectionAsMarkdownToClipboard"
          defaultMessage="Copy selection as Markdown"
        />
      ) : (
        <FormattedMessage
          id="unifiedDataTable.copySelectionToClipboard"
          defaultMessage="Copy selection as text"
        />
      )}
    </EuiContextMenuItem>
  );
};
