/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';

export function useContainerStyle(defaultRowHeight?: number) {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    // the keywords are slightly larger than the default text height,
    // so they need to be adjusted to fit within the row height while
    // not truncating the bottom of the text
    let rowHeight = 2;
    if (defaultRowHeight === undefined) {
      rowHeight = 2;
    } else if (defaultRowHeight < 2) {
      rowHeight = 1;
    } else {
      rowHeight = Math.floor(defaultRowHeight / 1.5);
    }

    return {
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical' as const,
      WebkitLineClamp: rowHeight,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      transform: `translateY(calc(${euiTheme.size.m} / 4))`, // we apply this transform so that the component appears vertically centered
    };
  }, [euiTheme, defaultRowHeight]);
}
