/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export type HistogramComparisonStatus = 'loading' | 'applied' | 'approximate' | 'unavailable';

export interface HistogramComparisonBadgeProps {
  description: string;
  status: HistogramComparisonStatus;
  onClear: () => void;
}

const clearLabel = i18n.translate('unifiedHistogram.comparison.clear', {
  defaultMessage: 'Clear comparison',
});

const statusNotes: Partial<Record<HistogramComparisonStatus, string>> = {
  approximate: i18n.translate('unifiedHistogram.comparison.approximate', {
    defaultMessage: 'Comparison is approximate.',
  }),
  unavailable: i18n.translate('unifiedHistogram.comparison.unavailable', {
    defaultMessage: 'Comparison is unavailable.',
  }),
};

const badgeItemCss = css({
  minWidth: 0,
  maxWidth: '24ch',
});

export const HistogramComparisonBadge = ({
  description,
  status,
  onClear,
}: HistogramComparisonBadgeProps) => {
  const note = statusNotes[status];

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      responsive={false}
      data-test-subj="unifiedHistogramComparison"
    >
      {status === 'loading' && (
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="s" data-test-subj="unifiedHistogramComparisonLoading" />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false} css={badgeItemCss}>
        <EuiBadge
          color="hollow"
          iconType="cross"
          iconSide="right"
          iconOnClick={onClear}
          iconOnClickAriaLabel={clearLabel}
          data-test-subj="unifiedHistogramComparisonBadge"
        >
          {description}
        </EuiBadge>
      </EuiFlexItem>
      {note && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" data-test-subj="unifiedHistogramComparisonNote">
            {note}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
