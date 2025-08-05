/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon, IconSize, type EuiIconProps } from '@elastic/eui';
import { getSpanIcon } from './get_span_icon';

interface Props extends Omit<EuiIconProps, 'type'> {
  type?: string;
  subtype?: string;
  size?: IconSize;
}

export function SpanIcon({ type, subtype, size = 'l', ...props }: Props) {
  const icon = getSpanIcon(type, subtype);
  return <EuiIcon type={icon} size={size} title={type || subtype} {...props} />;
}
