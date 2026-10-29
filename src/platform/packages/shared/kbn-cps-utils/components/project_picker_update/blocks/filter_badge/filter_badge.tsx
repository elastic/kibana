/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiBadge, type EuiBadgeProps, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  isNegatedOperator,
  type FilterExpressionValue,
  filterExpressionCodec,
} from '../../utils/filter_input_codec';
import { filterBadgeStyles } from './filter_badge.styles';

type FilterBadgeProps = EuiBadgeProps & {
  filter: FilterExpressionValue;
  /**
   * Applies EUI disabled-badge colors without setting isDisabled, so the badge
   * remains clickable (e.g. toggled-off filters that still open the menu).
   */
  isInactive?: boolean;
};

export function FilterBadge({
  filter,
  css,
  iconType,
  color,
  isInactive,
  ...props
}: FilterBadgeProps) {
  const euiThemeContext = useEuiTheme();
  const styles = useMemo(() => filterBadgeStyles(euiThemeContext), [euiThemeContext]);
  const isNegated = isNegatedOperator(filter.operator);
  const expression = String.prototype.slice.apply(filterExpressionCodec.encode(filter), [
    isNegated ? 1 : 0,
  ]);

  return (
    <EuiBadge
      css={[styles.container, isInactive && styles.inactive, css]}
      data-is-negated={isNegated}
      data-negation-string={i18n.translate('cpsUtils.filterBadge.negationString', {
        defaultMessage: 'NOT',
      })}
      color={color ?? 'hollow'}
      iconType={iconType === 'empty' ? undefined : iconType}
      {...props}
    >
      {expression}
    </EuiBadge>
  );
}
