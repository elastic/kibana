/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Series } from '../../../../../common/types';
import { getPalette } from '../palette';

export const getColumnState = (columnId: string, collapseFn?: string, series?: Series) => {
  const palette = series ? getPalette(series.color_rules ?? []) : undefined;
  return {
    columnId,
    alignment: 'left' as const,
    colorMode: palette ? 'text' : 'none',
    ...(palette ? { palette } : {}),
    ...(collapseFn ? { collapseFn } : {}),
  };
};
