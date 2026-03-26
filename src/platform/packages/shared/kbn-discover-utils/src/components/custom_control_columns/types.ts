/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonIconProps, IconType } from '@elastic/eui';
import type { Interpolation, Theme } from '@emotion/react';
import type { FC, ReactElement } from 'react';
import type React from 'react';
import type { DataTableRecord } from '../../types';

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
  render: (Control: RowControlComponent, props: RowControlRowProps) => ReactElement;
  width?: number;
}
