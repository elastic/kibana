/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiI18n, EuiCopy, EuiButtonIcon } from '@elastic/eui';

export const useCopy = ({ isCopyable, value }: { isCopyable: boolean; value: string }) => {
  const showCopyButton = isCopyable && value;

  const CopyButton = () => {
    if (!showCopyButton) return null;

    return (
      <div className="euiCodeBlock__copyButton">
        <EuiI18n token="euiCodeBlock.copyButton" default="Copy">
          {(copyButton: string) => (
            <EuiCopy textToCopy={value}>
              {(copy) => (
                <EuiButtonIcon
                  onClick={copy}
                  iconType="copyClipboard"
                  color="text"
                  aria-label={copyButton}
                  size="xs"
                />
              )}
            </EuiCopy>
          )}
        </EuiI18n>
      </div>
    );
  };

  return { showCopyButton, CopyButton };
};
