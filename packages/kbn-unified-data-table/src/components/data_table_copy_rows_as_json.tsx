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
import { copyRowsAsJsonToClipboard } from '../utils/copy_value_to_clipboard';
import { UnifiedDataTableContext } from '../table_context';

interface DataTableCopyRowsAsJsonProps {
  toastNotifications: ToastsStart;
}

export const DataTableCopyRowsAsJson: React.FC<DataTableCopyRowsAsJsonProps> = ({
  toastNotifications,
}) => {
  const { rows, selectedDocs, isPlainRecord } = useContext(UnifiedDataTableContext);

  return (
    <EuiContextMenuItem
      data-test-subj="dscGridCopySelectedDocumentsJSON"
      icon="copyClipboard"
      onClick={async () => {
        await copyRowsAsJsonToClipboard({
          selectedRows: rows.filter((row) => selectedDocs.includes(row.id)),
          toastNotifications,
        });
      }}
    >
      {isPlainRecord ? (
        <FormattedMessage
          id="unifiedDataTable.copyResultsToClipboardJSON"
          defaultMessage="Copy results to clipboard (JSON)"
        />
      ) : (
        <FormattedMessage
          id="unifiedDataTable.copyToClipboardJSON"
          defaultMessage="Copy documents to clipboard (JSON)"
        />
      )}
    </EuiContextMenuItem>
  );
};
