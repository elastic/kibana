/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { combineLatest, debounceTime } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

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
  EuiButtonGroup,
  EuiButtonIcon,
} from '@elastic/eui';
import { AppMountParameters } from '@kbn/core-application-browser';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { GridLayout, GridLayoutData, GridAccessMode } from '@kbn/grid-layout';
import { i18n } from '@kbn/i18n';

import { getPanelId } from './get_panel_id';
import {
  clearSerializedDashboardState,
  getSerializedDashboardState,
  setSerializedGridLayout,
} from './serialized_grid_layout';
import { MockSerializedDashboardState } from './types';
import { useMockDashboardApi } from './use_mock_dashboard_api';
import { dashboardInputToGridLayout, gridLayoutToDashboardPanelMap } from './utils';

const DASHBOARD_MARGIN_SIZE = 8;
const DASHBOARD_GRID_HEIGHT = 20;
const DASHBOARD_GRID_COLUMN_COUNT = 48;

export const GridExample = ({ coreStart }: { coreStart: CoreStart }) => {
  const savedState = useRef<MockSerializedDashboardState>(getSerializedDashboardState());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [expandedPanelId, setExpandedPanelId] = useState<string | undefined>();
  const [accessMode, setAccessMode] = useState<GridAccessMode>('EDIT');
  const [currentLayout, setCurrentLayout] = useState<GridLayoutData>(
    dashboardInputToGridLayout(savedState.current)
  );

  const mockDashboardApi = useMockDashboardApi({ savedState: savedState.current });

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

  const renderBasicPanel = useCallback(
    (id: string) => {
      return (
        <>
          <div style={{ padding: 8 }}>{id}</div>
          <EuiButtonEmpty
            onClick={() => {
              setExpandedPanelId(undefined);
              mockDashboardApi.removePanel(id);
            }}
          >
            {i18n.translate('examples.gridExample.deletePanelButton', {
              defaultMessage: 'Delete panel',
            })}
          </EuiButtonEmpty>
          <EuiButtonEmpty
            onClick={async () => {
              setExpandedPanelId(undefined);
              const newPanelId = await getPanelId({
                coreStart,
                suggestion: id,
              });
              if (newPanelId) mockDashboardApi.replacePanel(id, newPanelId);
            }}
          >
            {i18n.translate('examples.gridExample.replacePanelButton', {
              defaultMessage: 'Replace panel',
            })}
          </EuiButtonEmpty>
          <EuiButtonIcon
            iconType={expandedPanelId ? 'minimize' : 'expand'}
            onClick={() => setExpandedPanelId((expandedId) => (expandedId ? undefined : id))}
            aria-label={
              expandedPanelId
                ? i18n.translate('examples.gridExample.minimizePanel', {
                    defaultMessage: 'Minimize panel {id}',
                    values: { id },
                  })
                : i18n.translate('examples.gridExample.maximizePanel', {
                    defaultMessage: 'Maximize panel {id}',
                    values: { id },
                  })
            }
          />
        </>
      );
    },
    [coreStart, mockDashboardApi, setExpandedPanelId, expandedPanelId]
  );

  return (
    <EuiProvider>
      <EuiPageTemplate grow={false} offset={0} restrictWidth={false}>
        <EuiPageTemplate.Header
          iconType={'dashboardApp'}
          pageTitle={i18n.translate('examples.gridExample.pageTitle', {
            defaultMessage: 'Grid Layout Example',
          })}
        />
        <EuiPageTemplate.Section
          color="subdued"
          contentProps={{
            css: { display: 'flex', flexFlow: 'column nowrap', flexGrow: 1 },
          }}
        >
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
                clearSerializedDashboardState();
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
                  setExpandedPanelId(undefined);
                  const panelId = await getPanelId({
                    coreStart,
                    suggestion: uuidv4(),
                  });
                  if (panelId) mockDashboardApi.addNewPanel({ id: panelId });
                }}
              >
                {i18n.translate('examples.gridExample.addPanelButton', {
                  defaultMessage: 'Add a panel',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButtonGroup
                    legend={i18n.translate('examples.gridExample.layoutOptionsLegend', {
                      defaultMessage: 'Layout options',
                    })}
                    options={[
                      {
                        id: 'VIEW',
                        label: i18n.translate('examples.gridExample.viewOption', {
                          defaultMessage: 'View',
                        }),
                        toolTipContent:
                          'The layout adjusts when the window is resized. Panel interactivity, such as moving and resizing within the grid, is disabled.',
                      },
                      {
                        id: 'EDIT',
                        label: i18n.translate('examples.gridExample.editOption', {
                          defaultMessage: 'Edit',
                        }),
                        toolTipContent: 'The layout does not adjust when the window is resized.',
                      },
                    ]}
                    idSelected={accessMode}
                    onChange={(id) => {
                      setAccessMode(id as GridAccessMode);
                    }}
                  />
                </EuiFlexItem>
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
            accessMode={accessMode}
            expandedPanelId={expandedPanelId}
            layout={currentLayout}
            gridSettings={{
              gutterSize: DASHBOARD_MARGIN_SIZE,
              rowHeight: DASHBOARD_GRID_HEIGHT,
              columnCount: DASHBOARD_GRID_COLUMN_COUNT,
            }}
            renderPanelContents={renderBasicPanel}
            onLayoutChange={(newLayout) => {
              const { panels, rows } = gridLayoutToDashboardPanelMap(newLayout);
              mockDashboardApi.panels$.next(panels);
              mockDashboardApi.rows$.next(rows);
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
