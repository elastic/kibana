/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { GridLayout } from './types';
import { KibanaGridLayout } from './grid_layout';

export default {
  title: 'Kibana Grid Layout POC',
  description: 'POC of a new grid layout system for Kibana',
  argTypes: {},
};

export const GridLayoutStorybook = () => {
  const [gridLayout1, setGridLayout1] = useState<GridLayout>([
    {
      panel1: { column: 0, row: 0, width: 12, height: 6, id: 'panel1' },
      panel2: { column: 0, row: 6, width: 8, height: 4, id: 'panel2' },
      panel3: { column: 8, row: 6, width: 12, height: 4, id: 'panel3' },
      panel4: { column: 0, row: 10, width: 48, height: 4, id: 'panel4' },
      panel5: { column: 12, row: 0, width: 36, height: 6, id: 'panel5' },
      panel6: { column: 24, row: 6, width: 24, height: 4, id: 'panel6' },
      panel7: { column: 20, row: 6, width: 4, height: 2, id: 'panel7' },
      panel8: { column: 20, row: 8, width: 4, height: 2, id: 'panel8' },
    },
    {
      panel9: { column: 0, row: 0, width: 12, height: 6, id: 'panel9' },
    },
  ]);

  return (
    <KibanaGridLayout
      gridLayout={gridLayout1}
      setGridLayout={setGridLayout1}
      settings={{ gutterSize: 8, rowHeight: 26, columnCount: 48 }}
    />
  );
};
