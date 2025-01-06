/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIconProps, EuiDataGridControlColumn, IconType } from '@elastic/eui';
import type { Interpolation, Theme } from '@emotion/react';
import React, { FC, ReactElement } from 'react';
import { DataTableRecord } from '../../types';

export interface RowControlRowProps {
  rowIndex: number;
  record: DataTableRecord;
}

export interface RowControlProps {
  color?: EuiButtonIconProps['color'];
  css?: Interpolation<Theme>;
  'data-test-subj'?: string;
  disabled?: boolean;
  iconType: IconType;
  label: string;
  onClick: ((props: RowControlRowProps) => void) | undefined;
  tooltipContent?: React.ReactNode;
}

export type RowControlComponent = FC<RowControlProps>;

export interface RowControlColumn {
  id: string;
  headerAriaLabel: string;
  headerCellRender?: EuiDataGridControlColumn['headerCellRender'];
  renderControl: (Control: RowControlComponent, props: RowControlRowProps) => ReactElement;
}
