/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { ReactNode } from 'react';
import type { EuiCodeProps } from '@elastic/eui';
import { EuiCodeBlock, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { useI18n } from '@kbn/i18n-react';
import type { InjectedIntl } from '@kbn/i18n-react';

export interface AsCodeExportAssetPanelProps {
  readonly headingText: string;
  readonly helpText?: ReactNode;
  readonly language: EuiCodeProps['language'];
  readonly getValue: (intl: InjectedIntl) => string;
  readonly copyAriaLabel: string;
}

export const AsCodeExportAssetPanel = ({
  headingText,
  helpText,
  language,
  getValue,
  copyAriaLabel,
}: AsCodeExportAssetPanelProps) => {
  const intl = useI18n();
  const value = getValue(intl);

  return (
    <EuiFlexItem grow css={{ minHeight: 0 }}>
      <EuiFlexGroup direction="column" gutterSize="s" css={{ flex: '1 1 auto', minHeight: 0 }}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <h4>{headingText}</h4>
          </EuiText>
          {helpText ? (
            <EuiText size="s" color="subdued">
              {helpText}
            </EuiText>
          ) : null}
        </EuiFlexItem>

        <EuiFlexItem grow css={{ minHeight: 0 }}>
          <EuiCodeBlock
            data-test-subj="exportAssetValue"
            css={{ overflowWrap: 'break-word' }}
            overflowHeight="100%"
            language={language}
            whiteSpace="pre"
            isCopyable
            isVirtualized
            copyAriaLabel={copyAriaLabel}
          >
            {value}
          </EuiCodeBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

