/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import { copyToClipboard } from '@elastic/eui';
import React, { useContext } from 'react';
import type { ToastsStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { UnifiedDataTableContext } from '@kbn/unified-data-table/src/table_context';

export function formatTriggerEventPayloadAsText(payload: unknown): string {
  if (payload === undefined) {
    return '';
  }
  if (payload === null) {
    return 'null';
  }
  if (typeof payload === 'object') {
    return JSON.stringify(payload, null, 2);
  }
  return String(payload);
}

const copyFailedTitle = i18n.translate(
  'workflows.workflowExecuteEventTriggerForm.copyPayloadFailedTitle',
  {
    defaultMessage: 'Unable to copy to clipboard in this browser',
  }
);

const copiedTitle = i18n.translate(
  'workflows.workflowExecuteEventTriggerForm.copyPayloadCopiedTitle',
  {
    defaultMessage: 'Copied to clipboard',
  }
);

/**
 * Replaces the default "copy cell value" action for the trigger-event summary column.
 * {@link @kbn/unified-data-table}'s default copy uses the flattened `summary` string (badges + text);
 * workflows want the raw `payload` object as JSON instead.
 *
 * Assumes the unified table default cell actions keep "copy value" as the last entry in
 * {@link EuiDataGridColumn.cellActions} (see buildCellActions in default_cell_actions.tsx).
 */
export function createTriggerEventSummaryCopyPayloadCellAction(
  toastNotifications: ToastsStart
): (props: EuiDataGridColumnCellActionProps) => React.JSX.Element {
  return function TriggerEventSummaryCopyPayloadCellAction({
    Component,
    rowIndex,
  }: EuiDataGridColumnCellActionProps): React.JSX.Element {
    const { getRowByIndex } = useContext(UnifiedDataTableContext);
    const row = getRowByIndex(rowIndex);
    const source =
      row?.raw._source !== null && typeof row?.raw._source === 'object'
        ? (row.raw._source as Record<string, unknown>)
        : undefined;
    const payload = source?.payload;

    const ariaLabel = i18n.translate(
      'workflows.workflowExecuteEventTriggerForm.copyPayloadAriaLabel',
      {
        defaultMessage: 'Copy event payload',
      }
    );

    return (
      <Component
        iconType="copy"
        aria-label={ariaLabel}
        title={ariaLabel}
        data-test-subj="workflowTriggerEventSummaryCopyPayloadButton"
        onClick={() => {
          const text = formatTriggerEventPayloadAsText(payload);
          if (!copyToClipboard(text)) {
            toastNotifications.addWarning({ title: copyFailedTitle });
            return;
          }
          toastNotifications.addInfo({ title: copiedTitle });
        }}
      >
        {i18n.translate('workflows.workflowExecuteEventTriggerForm.copyPayloadButtonLabel', {
          defaultMessage: 'Copy value',
        })}
      </Component>
    );
  };
}
