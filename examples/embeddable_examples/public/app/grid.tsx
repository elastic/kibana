/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { KibanaGridLayout } from '../grid/grid_layout';
import { GridLayout } from '../grid/types';

export const GridPage = () => {
  return (
    <KibanaGridLayout
      getCreationOptions={() => {
        const initialLayout: GridLayout = [
          {
            title: 'Large section',
            isCollapsed: false,
            panels: {
              panel1: { column: 0, row: 0, width: 12, height: 6, id: 'panel1' },
              panel2: { column: 0, row: 6, width: 8, height: 4, id: 'panel2' },
              panel3: { column: 8, row: 6, width: 12, height: 4, id: 'panel3' },
              panel4: { column: 0, row: 10, width: 48, height: 4, id: 'panel4' },
              panel5: { column: 12, row: 0, width: 36, height: 6, id: 'panel5' },
              panel6: { column: 24, row: 6, width: 24, height: 4, id: 'panel6' },
              panel7: { column: 20, row: 6, width: 4, height: 2, id: 'panel7' },
              panel8: { column: 20, row: 8, width: 4, height: 2, id: 'panel8' },
            },
          },
          {
            title: 'Small section',
            isCollapsed: false,
            panels: { panel9: { column: 0, row: 0, width: 12, height: 6, id: 'panel9' } },
          },
          {
            title: 'Another small section',
            isCollapsed: false,
            panels: { panel10: { column: 24, row: 0, width: 12, height: 6, id: 'panel10' } },
          },
        ];

        return {
          gridSettings: { gutterSize: 8, rowHeight: 26, columnCount: 48 },
          initialLayout,
        };
      }}
    />
  );
};
