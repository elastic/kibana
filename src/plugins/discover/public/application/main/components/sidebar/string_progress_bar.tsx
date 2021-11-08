/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiProgress } from '@elastic/eui';

interface Props {
  percent: number;
  count: number;
  value: string;
}

export function StringFieldProgressBar({ value, percent, count }: Props) {
  const ariaLabel = `${value}: ${count} (${percent}%)`;

  return <EuiProgress value={percent} max={100} color="success" aria-label={ariaLabel} size="s" />;
}
