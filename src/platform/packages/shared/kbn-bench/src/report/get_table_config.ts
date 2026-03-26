/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BorderUserConfig } from 'table';

export function getTableConfig(columnCount: number = 4): {
  border: BorderUserConfig;
  singleLine?: boolean;
  columns: Record<number, { alignment: 'left' | 'right' }>;
} {
  return {
    border: {
      topBody: '',
      topJoin: '',
      topLeft: '',
      topRight: '',
      bottomBody: '',
      bottomJoin: '',
      bottomLeft: '',
      bottomRight: '',
      bodyLeft: '',
      bodyRight: '',
      bodyJoin: ' ',
      joinBody: '',
      joinLeft: '',
      joinRight: '',
      joinJoin: ' ',
    },
    singleLine: true,
    columns: new Array(columnCount).fill(undefined).map((_, idx) => {
      return { alignment: idx === 0 ? 'left' : 'right' };
    }),
  };
}
