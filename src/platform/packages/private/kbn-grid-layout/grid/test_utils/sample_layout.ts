/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutData, OrderedLayout } from '../types';

export const getSampleLayout = (): GridLayoutData => ({
  panel1: {
    id: 'panel1',
    row: 0,
    column: 0,
    width: 12,
    height: 6,
    type: 'panel',
  },
  panel2: {
    id: 'panel2',
    row: 6,
    column: 0,
    width: 8,
    height: 4,
    type: 'panel',
  },
  panel3: {
    id: 'panel3',
    row: 6,
    column: 8,
    width: 12,
    height: 4,
    type: 'panel',
  },
  panel4: {
    id: 'panel4',
    row: 10,
    column: 0,
    width: 48,
    height: 4,
    type: 'panel',
  },
  panel5: {
    id: 'panel5',
    row: 0,
    column: 12,
    width: 36,
    height: 6,
    type: 'panel',
  },
  panel6: {
    id: 'panel6',
    row: 6,
    column: 24,
    width: 24,
    height: 4,
    type: 'panel',
  },
  panel7: {
    id: 'panel7',
    row: 6,
    column: 20,
    width: 4,
    height: 2,
    type: 'panel',
  },
  panel8: {
    id: 'panel8',
    row: 8,
    column: 20,
    width: 4,
    height: 2,
    type: 'panel',
  },
  second: {
    title: 'Small section',
    isCollapsed: false,
    id: 'second',
    type: 'section',
    row: 14,
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
  third: {
    title: 'Another small section',
    isCollapsed: false,
    id: 'third',
    type: 'section',
    row: 15,
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
});

export const getSampleOrderedLayout = (): OrderedLayout => ({
  'main-0': {
    id: 'main-0',
    order: 0,
    isMainSection: true,
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
  second: {
    title: 'Small section',
    isCollapsed: false,
    id: 'second',
    isMainSection: false,
    order: 1,
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
  third: {
    title: 'Another small section',
    isCollapsed: false,
    id: 'third',
    isMainSection: false,
    order: 2,
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
});
