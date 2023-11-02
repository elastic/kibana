/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ApplyTime, EuiFlexGroup, EuiCopy, EuiFlexItem, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import useRafLoop from 'react-use/lib/useRafLoop';

const KIBANA_PREFIX = 'kibanaTimeRange:';
const KIBANA_REGEX = new RegExp(`^${KIBANA_PREFIX}`);

export function DateClipboardItems({
  start,
  end,
  applyTime,
}: {
  applyTime?: ApplyTime;
  start: string;
  end: string;
}) {
  const [clipboardDate, setClipboardDate] = useState<string | undefined>();

  useRafLoop(() => {
    navigator.clipboard.readText().then((clipText) => {
      if (KIBANA_REGEX.test(clipText)) {
        setClipboardDate(clipText.replace(KIBANA_PREFIX, ''));
      }
    });
  });

  function applyPastedTimerange() {
    const [newStart, newEnd] = clipboardDate?.split(' to ') || [];
    if (newStart != null && newEnd != null) {
      applyTime!({ start: newStart, end: newEnd });
    }
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={`${KIBANA_PREFIX}${start} to ${end}`}>
          {(copy) => (
            <EuiLink
              onClick={() => {
                copy();
              }}
            >
              {i18n.translate('unifiedSearch.queryBarTopRow.datePicker.clipboardCopyLabel', {
                defaultMessage: 'Copy time range',
              })}
            </EuiLink>
          )}
        </EuiCopy>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiLink onClick={applyPastedTimerange} disabled={!clipboardDate}>
          {clipboardDate
            ? i18n.translate('unifiedSearch.queryBarTopRow.datePicker.clipboardPasteLabel', {
                defaultMessage: 'Paste time range',
              })
            : i18n.translate('unifiedSearch.queryBarTopRow.datePicker.clipboardNoPasteLabel', {
                defaultMessage: 'No data in clipboard',
              })}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
