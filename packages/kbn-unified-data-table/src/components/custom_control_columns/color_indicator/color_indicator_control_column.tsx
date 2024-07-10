/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext } from 'react';
import { css } from '@emotion/react';
import { EuiDataGridControlColumn, useEuiTheme, EuiThemeComputed } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { UnifiedDataTableContext } from '../../../table_context';

const COLOR_INDICATOR_WIDTH = 4;

interface ColorIndicatorCellParams {
  rowIndex: number;
  getRowIndicator: (
    row: DataTableRecord,
    euiTheme: EuiThemeComputed
  ) => { color: string; label: string } | undefined;
}

const ColorIndicatorCell: React.FC<ColorIndicatorCellParams> = ({ rowIndex, getRowIndicator }) => {
  const { euiTheme } = useEuiTheme();
  const { rows } = useContext(UnifiedDataTableContext);
  const row = rows[rowIndex];
  const configuration = row ? getRowIndicator(row, euiTheme) : undefined;
  const color = configuration?.color || 'transparent';
  const label = configuration?.label;

  return (
    <div
      data-test-subj="unifiedDataTableRowColorIndicatorCell"
      title={label}
      css={css`
        background: ${color};
        width: ${COLOR_INDICATOR_WIDTH}px;
        height: 100%;
      `}
    />
  );
};

export interface ColorIndicatorControlColumnParams {
  getRowIndicator: ColorIndicatorCellParams['getRowIndicator'];
}

export const getColorIndicatorControlColumn = ({
  getRowIndicator,
}: ColorIndicatorControlColumnParams): EuiDataGridControlColumn => {
  return {
    id: 'colorIndicator',
    width: COLOR_INDICATOR_WIDTH,
    headerCellRender: () => {
      return null;
    },
    rowCellRender: ({ rowIndex }) => {
      return <ColorIndicatorCell rowIndex={rowIndex} getRowIndicator={getRowIndicator} />;
    },
  };
};
