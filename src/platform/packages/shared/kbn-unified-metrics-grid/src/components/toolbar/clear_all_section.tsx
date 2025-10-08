/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';

export interface ClearAllSectionProps {
  selectedOptionsMessage?: string;
  selectedOptionsLength: number;
  onClearAllAction: () => void;
}

export const ClearAllSection = ({
  selectedOptionsMessage,
  selectedOptionsLength,
  onClearAllAction,
}: ClearAllSectionProps) => {
  const { euiTheme } = useEuiTheme();
  const clearSelectionButtonLabel = i18n.translate(
    'metricsExperience.clearAllSection.clearSelectionButtonLabel',
    {
      defaultMessage: 'Clear selection',
    }
  );
  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="s"
      responsive={false}
    >
      {selectedOptionsMessage && (
        <EuiFlexItem grow={false}>
          <EuiText
            size="s"
            color="subdued"
            css={css`
              padding: ${euiTheme.size.s};
            `}
          >
            {selectedOptionsMessage}
          </EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        {selectedOptionsLength > 0 && (
          <EuiButtonEmpty
            aria-label={clearSelectionButtonLabel}
            size="s"
            flush="both"
            onClick={onClearAllAction}
          >
            {clearSelectionButtonLabel}
          </EuiButtonEmpty>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
