/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, mathWithUnits, useEuiTheme } from '@elastic/eui';
import type { CSSObject } from '@emotion/react';
import { getLogLevelCoalescedValue, getLogLevelColor } from '@kbn/discover-utils';
import { euiThemeVars } from '@kbn/ui-theme';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
import React from 'react';

const badgeCss: CSSObject = {
  marginTop: '-4px',
  maxWidth: mathWithUnits(euiThemeVars.euiSize, (size) => size * 7.5),
};

export const getLogLevelBadgeCell =
  (logLevelField: string) => (props: DataGridCellValueElementProps) => {
    const { euiTheme } = useEuiTheme();
    const value = props.row.flattened[logLevelField];

    if (!value) {
      return <span data-test-subj="logLevelBadgeCell-empty">-</span>;
    }

    const coalescedValue = getLogLevelCoalescedValue(value);
    const color = coalescedValue ? getLogLevelColor(coalescedValue, euiTheme) : undefined;

    return (
      <EuiBadge
        color={color}
        data-test-subj={`logLevelBadgeCell-${coalescedValue ?? 'unknown'}`}
        css={badgeCss}
      >
        {value}
      </EuiBadge>
    );
  };
