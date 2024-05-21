/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonEmpty, EuiFlexItem, copyToClipboard } from '@elastic/eui';
import React from 'react';
import { copyValueAriaText, copyValueText } from './translations';

export const CopyButton = ({ property, value }: { property: string; value: string }) => {
  const ariaCopyValueText = copyValueAriaText(property);

  return (
    <EuiFlexItem key="copyToClipboardAction">
      <EuiButtonEmpty
        size="s"
        iconType="copyClipboard"
        aria-label={ariaCopyValueText}
        onClick={() => copyToClipboard(value)}
        data-test-subj={`dataTableCellAction_copyToClipboardAction_${property}`}
      >
        {copyValueText}
      </EuiButtonEmpty>
    </EuiFlexItem>
  );
};
