/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiProgress } from '@elastic/eui';
import React from 'react';

export const unit = 16;

// TODO: extend from EUI's EuiProgress prop interface
export interface ImpactBarProps extends Record<string, unknown> {
  value: number;
  size?: 's' | 'l' | 'm';
  max?: number;
  color?: string;
}

const style = { width: `${unit * 6}px` };

export function ImpactBar({
  value,
  size = 'm',
  max = 100,
  color = 'primary',
  ...rest
}: ImpactBarProps) {
  return <EuiProgress size={size} value={value} max={max} color={color} style={style} {...rest} />;
}
