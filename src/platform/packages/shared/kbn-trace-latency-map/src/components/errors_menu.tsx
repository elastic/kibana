/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';

/**
 * Error actions, together under one menu, so later ones (such as comparing the failed
 * requests against the successful ones) join the filter rather than crowd the header.
 */
export function ErrorsMenu({
  failedOnly,
  onFailedOnlyChange,
  isDisabled,
}: {
  failedOnly: boolean;
  onFailedOnlyChange: (failedOnly: boolean) => void;
  isDisabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <EuiPopover
      aria-label={i18n.translate('traceLatencyMap.errorsMenu.ariaLabel', {
        defaultMessage: 'Error actions',
      })}
      button={
        <EuiButtonEmpty
          size="xs"
          color="danger"
          iconType="warning"
          isDisabled={isDisabled}
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj="traceLatencyMapErrorsMenu"
        >
          {failedOnly
            ? i18n.translate('traceLatencyMap.errorsMenu.buttonFiltered', {
                defaultMessage: 'Errors (filtered)',
              })
            : i18n.translate('traceLatencyMap.errorsMenu.button', { defaultMessage: 'Errors' })}
        </EuiButtonEmpty>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="filter"
            icon={failedOnly ? 'check' : 'empty'}
            onClick={() => {
              setIsOpen(false);
              onFailedOnlyChange(!failedOnly);
            }}
            data-test-subj="traceLatencyMapFailedOnly"
          >
            {i18n.translate('traceLatencyMap.errorsMenu.showOnlyErrors', {
              defaultMessage: 'Show only errors',
            })}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
}
