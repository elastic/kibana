/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ExportSourcePanelProps } from '../types';

const defaultCopyAriaLabel = i18n.translate('exportSource.copyAriaLabel', {
  defaultMessage: 'Copy export source',
});

export const ExportSourcePanel = ({
  title,
  description,
  source,
  language = 'json',
  dataTestSubj,
}: ExportSourcePanelProps) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj={dataTestSubj}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
      </EuiFlexItem>
      {description ? (
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {description}
          </EuiText>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCodeBlock
          overflowHeight="100%"
          language={language}
          isCopyable
          copyAriaLabel={defaultCopyAriaLabel}
          data-test-subj="exportSourceCodeBlock"
        >
          {JSON.stringify(source, null, 2)}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
