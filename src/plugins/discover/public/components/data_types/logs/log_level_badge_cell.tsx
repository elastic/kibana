/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, useEuiTheme } from '@elastic/eui';
import type { CSSObject } from '@emotion/react';
import { getLogLevelCoalescedValue, getLogLevelColor } from '@kbn/discover-utils';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import React from 'react';

const badgeCss: CSSObject = { marginTop: '-4px' };

export const LogLevelBadgeCell = (props: DataGridCellValueElementProps) => {
  const { euiTheme } = useEuiTheme();
  const value = props.row.flattened['log.level'];

  if (!value) {
    return <>-</>;
  }

  const coalescedValue = getLogLevelCoalescedValue(value);
  const color = coalescedValue ? getLogLevelColor(coalescedValue, euiTheme) : undefined;

  return (
    <EuiBadge color={color} css={badgeCss}>
      {value}
    </EuiBadge>
  );
};
