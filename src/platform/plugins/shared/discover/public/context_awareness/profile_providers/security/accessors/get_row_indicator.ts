/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFieldValue } from '@kbn/discover-utils';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';

export const getAlertEventRowIndicator: NonNullable<UnifiedDataTableProps['getRowIndicator']> = (
  row,
  euiTheme
) => {
  let eventColor = euiTheme.colors.backgroundLightText;
  let rowLabel = 'event';

  if (getFieldValue(row, 'event.kind') === 'signal') {
    eventColor = euiTheme.colors.warning;
    rowLabel = 'alert';
  }

  return {
    color: eventColor,
    label: rowLabel,
  };
};
