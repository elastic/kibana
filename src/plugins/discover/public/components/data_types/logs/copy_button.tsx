/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, EuiCopy } from '@elastic/eui';
import React from 'react';
import { copyValueAriaText, copyValueText } from './translations';

export const CopyButton = ({ property, value }: { property: string; value: string }) => {
  const ariaCopyValueText = copyValueAriaText(property);

  return (
    <EuiCopy textToCopy={value}>
      {(copy) => (
        <EuiButtonEmpty
          key="copyToClipboardAction"
          size="s"
          iconType="copyClipboard"
          aria-label={ariaCopyValueText}
          onClick={copy}
          data-test-subj={`dataTableCellAction_copyToClipboardAction_${property}`}
        >
          {copyValueText}
        </EuiButtonEmpty>
      )}
    </EuiCopy>
  );
};
