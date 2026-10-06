/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type EuiBadgeProps } from '@elastic/eui';
import { type FilterExpressionValue } from '../../utils/filter_input_codec';
type FilterBadgeProps = EuiBadgeProps & {
  filter: FilterExpressionValue;
  /**
   * Applies EUI disabled-badge colors without setting isDisabled, so the badge
   * remains clickable (e.g. toggled-off filters that still open the menu).
   */
  isInactive?: boolean;
};
export declare function FilterBadge({
  filter,
  css,
  iconType,
  color,
  isInactive,
  ...props
}: FilterBadgeProps): React.JSX.Element;
export {};
