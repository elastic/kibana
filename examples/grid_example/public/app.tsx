/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { v4 as uuidv4 } from 'uuid';

import {
  EuiBadge,
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
import { GridLayout, GridLayoutData, isLayoutEqual, type GridLayoutApi } from '@kbn/grid-layout';
import { getPanelId } from './get_panel_id';
import {
  clearSerializedGridLayout,
  getSerializedGridLayout,
  setSerializedGridLayout,
} from './serialized_grid_layout';

const DASHBOARD_MARGIN_SIZE = 8;
const DASHBOARD_GRID_HEIGHT = 20;
const DASHBOARD_GRID_COLUMN_COUNT = 48;
const DEFAULT_PANEL_HEIGHT = 15;
const DEFAULT_PANEL_WIDTH = DASHBOARD_GRID_COLUMN_COUNT / 2;

export const GridExample = ({ coreStart }: { coreStart: CoreStart }) => {
  const [layoutKey, setLayoutKey] = useState<string>(uuidv4());
  const [gridLayoutApi, setGridLayoutApi] = useState<GridLayoutApi | null>();
  const [savedLayout, setSavedLayout] = useState<GridLayoutData>(getSerializedGridLayout());
  const [currentLayout, setCurrentLayout] = useState<GridLayoutData>(savedLayout);

  const hasUnsavedChanges = useMemo(() => {
    return !isLayoutEqual(savedLayout, currentLayout);
  }, [savedLayout, currentLayout]);

  return (
    <EuiProvider>
      <EuiPageTemplate grow={false} offset={0} restrictWidth={false}>
        <EuiPageTemplate.Header iconType={'dashboardApp'} pageTitle="Grid Layout Example" />
        <EuiPageTemplate.Section color="subdued">
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={async () => {
                  const panelId = await getPanelId({
                    coreStart,
                    suggestion: `panel${(gridLayoutApi?.getPanelCount() ?? 0) + 1}`,
                  });
                  if (panelId)
                    gridLayoutApi?.addPanel(panelId, {
                      width: DEFAULT_PANEL_WIDTH,
                      height: DEFAULT_PANEL_HEIGHT,
                    });
                }}
              >
                Add a panel
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                {hasUnsavedChanges && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="warning">Unsaved changes</EuiBadge>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={() => {
                      clearSerializedGridLayout();
                      setCurrentLayout(savedLayout);
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
                        const layoutToSave = gridLayoutApi.serializeState();
                        setSerializedGridLayout(layoutToSave);
                        setSavedLayout(layoutToSave);
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
            onLayoutChange={(newLayout) => {
              setCurrentLayout(newLayout);
            }}
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
              return {
                gridSettings: {
                  gutterSize: DASHBOARD_MARGIN_SIZE,
                  rowHeight: DASHBOARD_GRID_HEIGHT,
                  columnCount: DASHBOARD_GRID_COLUMN_COUNT,
                },
                initialLayout: savedLayout,
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
