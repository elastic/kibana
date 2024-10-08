/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { GridLayout, type GridLayoutData, type GridLayoutApi } from '@kbn/grid-layout';
import { AppMountParameters } from '@kbn/core-application-browser';
import { EuiButton, EuiPageTemplate, EuiProvider, EuiSpacer } from '@elastic/eui';
import {
  DASHBOARD_GRID_COLUMN_COUNT,
  DASHBOARD_GRID_HEIGHT,
  DASHBOARD_MARGIN_SIZE,
} from '@kbn/grid-layout/grid/constants';

export const GridExample = () => {
  const [gridLayoutApi, setGridLayoutApi] = useState<GridLayoutApi | null>();

  return (
    <EuiProvider>
      <EuiPageTemplate grow={false} offset={0} restrictWidth={false}>
        <EuiPageTemplate.Header iconType={'dashboardApp'} pageTitle="Grid Layout Example" />
        <EuiPageTemplate.Section color="subdued">
          <EuiButton
            onClick={() => {
              gridLayoutApi?.addNewPanel(`panel${(gridLayoutApi?.getPanelCount() ?? 0) + 1}`);
            }}
          >
            Add a panel
          </EuiButton>
          <EuiSpacer size="m" />
          <GridLayout
            ref={setGridLayoutApi}
            renderPanelContents={(id) => {
              return <div style={{ padding: 8 }}>{id}</div>;
            }}
            getCreationOptions={() => {
              const initialLayout: GridLayoutData = [
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
                  panels: { panel9: { column: 0, row: 0, width: 12, height: 16, id: 'panel9' } },
                },
                {
                  title: 'Another small section',
                  isCollapsed: false,
                  panels: { panel10: { column: 24, row: 0, width: 12, height: 6, id: 'panel10' } },
                },
              ];

              return {
                gridSettings: {
                  gutterSize: DASHBOARD_MARGIN_SIZE,
                  rowHeight: DASHBOARD_GRID_HEIGHT,
                  columnCount: DASHBOARD_GRID_COLUMN_COUNT,
                },
                initialLayout,
              };
            }}
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </EuiProvider>
  );
};

export const renderGridExampleApp = (element: AppMountParameters['element']) => {
  ReactDOM.render(<GridExample />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
