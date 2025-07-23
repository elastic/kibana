/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiCopy, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface CopyInputProps {
  value: string;
}

export const CopyInput: React.FC<CopyInputProps> = ({ value }) => {
  const textRef = React.useRef<HTMLSpanElement>(null);

  return (
    <EuiPanel borderRadius="none" hasShadow={false} color={'subdued'} grow={false}>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiText
            size={'s'}
            color={'subdued'}
            style={{ wordBreak: 'break-all' }}
            data-test-subj="copyInputValue"
          >
            <span
              ref={textRef}
              onMouseDown={(event) => {
                const span = textRef.current;
                if (!span) return;
                if (window.getSelection && document.createRange) {
                  const selection = window.getSelection();
                  if (!selection) return;
                  event.preventDefault();
                  const range = document.createRange();
                  range.selectNodeContents(span);
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
              }}
              data-test-subj="copyText"
            >
              {value}
            </span>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={value}>
            {(copy) => (
              <EuiButtonIcon
                onClick={copy}
                iconType="copyClipboard"
                size="m"
                color={'text'}
                aria-label={i18n.translate(
                  'cloud.connectionDetails.components.copyInput.copyBtn.label',
                  {
                    defaultMessage: 'Copy to clipboard',
                  }
                )}
              />
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
