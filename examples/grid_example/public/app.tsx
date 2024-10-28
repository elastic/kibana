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
import { v4 as uuidv4 } from 'uuid';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiProvider,
  EuiSpacer,
} from '@elastic/eui';
import { AppMountParameters } from '@kbn/core-application-browser';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { GridLayout, type GridLayoutApi } from '@kbn/grid-layout';
import {
  DASHBOARD_GRID_COLUMN_COUNT,
  DASHBOARD_GRID_HEIGHT,
  DASHBOARD_MARGIN_SIZE,
} from '@kbn/grid-layout/grid/constants';
import { getPanelId } from './get_panel_id';
import {
  clearSerializedGridLayout,
  getSerializedGridLayout,
  setSerializedGridLayout,
} from './serialized_grid_layout';

export const GridExample = ({ coreStart }: { coreStart: CoreStart }) => {
  const [layoutKey, setLayoutKey] = useState<string>(uuidv4());
  const [gridLayoutApi, setGridLayoutApi] = useState<GridLayoutApi | null>();

  return (
    <EuiProvider>
      <EuiPageTemplate grow={false} offset={0} restrictWidth={false}>
        <EuiPageTemplate.Header iconType={'dashboardApp'} pageTitle="Grid Layout Example" />
        <EuiPageTemplate.Section color="subdued">
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={async () => {
                  const panelId = await getPanelId({
                    coreStart,
                    suggestion: `panel${(gridLayoutApi?.getPanelCount() ?? 0) + 1}`,
                  });
                  if (panelId) gridLayoutApi?.addPanel(panelId);
                }}
              >
                Add a panel
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={() => {
                      clearSerializedGridLayout();
                      setLayoutKey(uuidv4()); // force remount of grid
                    }}
                  >
                    Reset
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={() => {
                      if (gridLayoutApi) {
                        setSerializedGridLayout(gridLayoutApi.serializeState());
                      }
                    }}
                  >
                    Save
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <GridLayout
            // onLayoutChange
            key={layoutKey}
            ref={setGridLayoutApi}
            renderPanelContents={(id) => {
              return (
                <>
                  <div style={{ padding: 8 }}>{id}</div>
                  <EuiButtonEmpty
                    onClick={() => {
                      gridLayoutApi?.removePanel(id);
                    }}
                  >
                    Delete this panel
                  </EuiButtonEmpty>
                  <EuiButtonEmpty
                    onClick={async () => {
                      const newPanelId = await getPanelId({
                        coreStart,
                        suggestion: `panel${(gridLayoutApi?.getPanelCount() ?? 0) + 1}`,
                      });
                      if (newPanelId) gridLayoutApi?.replacePanel(id, newPanelId);
                    }}
                  >
                    Replace this panel
                  </EuiButtonEmpty>
                </>
              );
            }}
            getCreationOptions={() => {
              const initialLayout = getSerializedGridLayout();
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

export const renderGridExampleApp = (
  element: AppMountParameters['element'],
  coreStart: CoreStart
) => {
  ReactDOM.render(<GridExample coreStart={coreStart} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
