/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import { cloneDeep } from 'lodash';
import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { BehaviorSubject, combineLatest, debounceTime } from 'rxjs';

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiProvider,
  EuiSpacer,
} from '@elastic/eui';
import { AppMountParameters } from '@kbn/core-application-browser';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { GridLayout, GridLayoutData } from '@kbn/grid-layout';
import { i18n } from '@kbn/i18n';

import {
  clearSerializedGridLayout,
  getSerializedGridLayout,
  setSerializedGridLayout,
} from './serialized_grid_layout';
import {
  MockSerializedDashboardState,
  MockedDashboardPanelMap,
  MockedDashboardRowMap,
} from './types';
import { dashboardInputToGridLayout, gridLayoutToDashboardPanelMap } from './utils';
import { getPanelId } from './get_panel_id';

const DASHBOARD_MARGIN_SIZE = 8;
const DASHBOARD_GRID_HEIGHT = 20;
const DASHBOARD_GRID_COLUMN_COUNT = 48;
const DEFAULT_PANEL_HEIGHT = 15;
const DEFAULT_PANEL_WIDTH = DASHBOARD_GRID_COLUMN_COUNT / 2;

export const GridExample = ({ coreStart }: { coreStart: CoreStart }) => {
  const savedState = useRef<MockSerializedDashboardState>(getSerializedGridLayout());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [currentLayout, setCurrentLayout] = useState<GridLayoutData>(
    dashboardInputToGridLayout(savedState.current)
  );

  const mockDashboardApi = useMemo(() => {
    return {
      viewMode: new BehaviorSubject('edit'),
      panels$: new BehaviorSubject<MockedDashboardPanelMap>(savedState.current.panels),
      rows$: new BehaviorSubject<MockedDashboardRowMap>(savedState.current.rows),
      removePanel: (id: string) => {
        const panels = { ...mockDashboardApi.panels$.getValue() };
        delete panels[id]; // the grid layout component will handle collapsing, if necessary
        mockDashboardApi.panels$.next(panels);
      },
      replacePanel: (oldId: string, newId: string) => {
        const currentPanels = mockDashboardApi.panels$.getValue();
        const otherPanels = { ...currentPanels };
        const oldPanel = currentPanels[oldId];
        delete otherPanels[oldId];
        otherPanels[newId] = { id: newId, gridData: { ...oldPanel.gridData, i: newId } };
        mockDashboardApi.panels$.next(otherPanels);
      },
      addNewPanel: ({ id: newId }: { id: string }) => {
        // we are only implementing "place at top" here
        const currentPanels = mockDashboardApi.panels$.getValue();
        const otherPanels = { ...currentPanels };
        for (const [id, panel] of Object.entries(currentPanels)) {
          const currentPanel = cloneDeep(panel);
          currentPanel.gridData.y = currentPanel.gridData.y + DEFAULT_PANEL_HEIGHT;
          otherPanels[id] = currentPanel;
        }

        mockDashboardApi.panels$.next({
          ...otherPanels,
          [newId]: {
            id: newId,
            gridData: {
              i: newId,
              row: 0,
              x: 0,
              y: 0,
              w: DEFAULT_PANEL_WIDTH,
              h: DEFAULT_PANEL_HEIGHT,
            },
          },
        });
      },
      canRemovePanels: () => true,
    };
    // only run onMount
  }, []);

  useEffect(() => {
    combineLatest([mockDashboardApi.panels$, mockDashboardApi.rows$])
      .pipe(debounceTime(0)) // debounce to avoid subscribe being called twice when both panels$ and rows$ publish
      .subscribe(([panels, rows]) => {
        const hasChanges = !(
          deepEqual(panels, savedState.current.panels) && deepEqual(rows, savedState.current.rows)
        );
        setHasUnsavedChanges(hasChanges);
        setCurrentLayout(dashboardInputToGridLayout({ panels, rows }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPanel = useCallback((id: string) => {
    return (
      <>
        <div style={{ padding: 8 }}>{id}</div>
        <EuiButtonEmpty
          onClick={() => {
            mockDashboardApi.removePanel(id);
          }}
        >
          {i18n.translate('examples.gridExample.deletePanelButton', {
            defaultMessage: 'Delete panel',
          })}
        </EuiButtonEmpty>
        <EuiButtonEmpty
          onClick={async () => {
            const newPanelId =
              (await getPanelId({
                coreStart,
                suggestion: `panel${Object.keys(mockDashboardApi.panels$.getValue()).length + 1}`,
              })) ?? uuidv4();
            mockDashboardApi.replacePanel(id, newPanelId);
          }}
        >
          {i18n.translate('examples.gridExample.replacePanelButton', {
            defaultMessage: 'Replace panel',
          })}
        </EuiButtonEmpty>
      </>
    );
  }, []);

  return (
    <EuiProvider>
      <EuiPageTemplate grow={false} offset={0} restrictWidth={false}>
        <EuiPageTemplate.Header
          iconType={'dashboardApp'}
          pageTitle={i18n.translate('examples.gridExample.pageTitle', {
            defaultMessage: 'Grid Layout Example',
          })}
        />
        <EuiPageTemplate.Section color="subdued">
          <EuiCallOut
            title={i18n.translate('examples.gridExample.sessionStorageCallout', {
              defaultMessage:
                'This example uses session storage to persist saved state and unsaved changes',
            })}
          >
            <EuiButton
              color="accent"
              size="s"
              onClick={() => {
                clearSerializedGridLayout();
                window.location.reload();
              }}
            >
              {i18n.translate('examples.gridExample.resetExampleButton', {
                defaultMessage: 'Reset example',
              })}
            </EuiButton>
          </EuiCallOut>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={async () => {
                  const panelId =
                    (await getPanelId({
                      coreStart,
                      suggestion: `panel${
                        Object.keys(mockDashboardApi.panels$.getValue()).length + 1
                      }`,
                    })) ?? uuidv4();
                  mockDashboardApi.addNewPanel({ id: panelId });
                }}
              >
                {i18n.translate('examples.gridExample.addPanelButton', {
                  defaultMessage: 'Add a panel',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                {hasUnsavedChanges && (
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="warning">
                      {i18n.translate('examples.gridExample.unsavedChangesBadge', {
                        defaultMessage: 'Unsaved changes',
                      })}
                    </EuiBadge>
                  </EuiFlexItem>
                )}
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={() => {
                      const { panels, rows } = savedState.current;
                      mockDashboardApi.panels$.next(panels);
                      mockDashboardApi.rows$.next(rows);
                    }}
                  >
                    {i18n.translate('examples.gridExample.resetLayoutButton', {
                      defaultMessage: 'Reset',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    onClick={() => {
                      const newSavedState = {
                        panels: mockDashboardApi.panels$.getValue(),
                        rows: mockDashboardApi.rows$.getValue(),
                      };
                      savedState.current = newSavedState;
                      setHasUnsavedChanges(false);
                      setSerializedGridLayout(newSavedState);
                    }}
                  >
                    {i18n.translate('examples.gridExample.saveLayoutButton', {
                      defaultMessage: 'Save',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <GridLayout
            gridSettings={{
              gutterSize: DASHBOARD_MARGIN_SIZE,
              rowHeight: DASHBOARD_GRID_HEIGHT,
              columnCount: DASHBOARD_GRID_COLUMN_COUNT,
            }}
            layout={currentLayout}
            onLayoutChange={(newLayout) => {
              const { panels, rows } = gridLayoutToDashboardPanelMap(newLayout);
              mockDashboardApi.panels$.next(panels);
              mockDashboardApi.rows$.next(rows);
            }}
            renderPanelContents={renderPanel}
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
