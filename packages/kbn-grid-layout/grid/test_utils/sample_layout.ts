/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutData } from '../types';

export const getSampleLayout = (): GridLayoutData => [
  {
    title: 'Large section',
    isCollapsed: false,
    panels: {
      panel1: {
        id: 'panel1',
        row: 0,
        column: 0,
        width: 12,
        height: 6,
      },
      panel2: {
        id: 'panel2',
        row: 6,
        column: 0,
        width: 8,
        height: 4,
      },
      panel3: {
        id: 'panel3',
        row: 6,
        column: 8,
        width: 12,
        height: 4,
      },
      panel4: {
        id: 'panel4',
        row: 10,
        column: 0,
        width: 48,
        height: 4,
      },
      panel5: {
        id: 'panel5',
        row: 0,
        column: 12,
        width: 36,
        height: 6,
      },
      panel6: {
        id: 'panel6',
        row: 6,
        column: 24,
        width: 24,
        height: 4,
      },
      panel7: {
        id: 'panel7',
        row: 6,
        column: 20,
        width: 4,
        height: 2,
      },
      panel8: {
        id: 'panel8',
        row: 8,
        column: 20,
        width: 4,
        height: 2,
      },
    },
  },
  {
    title: 'Small section',
    isCollapsed: false,
    panels: {
      panel9: {
        id: 'panel9',
        row: 0,
        column: 0,
        width: 12,
        height: 16,
      },
    },
  },
  {
    title: 'Another small section',
    isCollapsed: false,
    panels: {
      panel10: {
        id: 'panel10',
        row: 0,
        column: 24,
        width: 12,
        height: 6,
      },
    },
  },
];
