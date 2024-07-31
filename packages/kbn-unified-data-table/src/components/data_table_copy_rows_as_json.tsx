/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiContextMenuItem } from '@elastic/eui';
import type { ToastsStart } from '@kbn/core/public';
import { copyRowsAsJsonToClipboard } from '../utils/copy_value_to_clipboard';
import { UnifiedDataTableContext } from '../table_context';

interface DataTableCopyRowsAsJsonProps {
  toastNotifications: ToastsStart;
  onCompleted: () => void;
}

export const DataTableCopyRowsAsJson: React.FC<DataTableCopyRowsAsJsonProps> = ({
  toastNotifications,
  onCompleted,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { rows, selectedDocsState, isPlainRecord } = useContext(UnifiedDataTableContext);
  const { getSelectedDocsOrderedByRows } = selectedDocsState;

  return (
    <EuiContextMenuItem
      data-test-subj="dscGridCopySelectedDocumentsJSON"
      icon="copyClipboard"
      disabled={isProcessing}
      onClick={async () => {
        setIsProcessing(true);
        await copyRowsAsJsonToClipboard({
          // preserving the original order of rows rather than the order of selecting rows
          selectedRows: getSelectedDocsOrderedByRows(rows),
          toastNotifications,
        });
        setIsProcessing(false);
        onCompleted();
      }}
    >
      {isPlainRecord ? (
        <FormattedMessage
          id="unifiedDataTable.copyResultsToClipboardJSON"
          defaultMessage="Copy results as JSON"
        />
      ) : (
        <FormattedMessage
          id="unifiedDataTable.copyDocsToClipboardJSON"
          defaultMessage="Copy documents as JSON"
        />
      )}
    </EuiContextMenuItem>
  );
};
