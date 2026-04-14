/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiButtonEmpty, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

/**
 * Props for the {@link FilterSelectionHeader} component.
 */
export interface FilterSelectionHeaderProps {
  /** Number of active filter selections. */
  activeCount: number;
  /** Callback to clear all selections. */
  onClear: () => void;
  /** `data-test-subj` attribute for the clear button. */
  'data-test-subj'?: string;
}

/**
 * Displays the selection count and clear filter button.
 * Used in multi-select filter popovers.
 */
export const FilterSelectionHeader = ({
  activeCount,
  onClear,
  'data-test-subj': dataTestSubj,
}: FilterSelectionHeaderProps) => {
  const { euiTheme } = useEuiTheme();
  const hasActiveFilters = activeCount > 0;

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="s"
      responsive={false}
      css={css`
        margin-top: ${euiTheme.size.s};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('contentManagement.contentList.filter.selectedCount', {
            defaultMessage: '{count, plural, =0 {0 selected} other {# selected}}',
            values: { count: activeCount },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {hasActiveFilters && (
          <EuiButtonEmpty size="xs" flush="right" onClick={onClear} data-test-subj={dataTestSubj}>
            {i18n.translate('contentManagement.contentList.filter.clearFilter', {
              defaultMessage: 'Clear filter',
            })}
          </EuiButtonEmpty>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
