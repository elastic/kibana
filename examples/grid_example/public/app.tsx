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
} from '@elastic/eui';
import { AppMountParameters } from '@kbn/core-application-browser';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import {
  SearchApi,
  SearchSerializedState,
} from '@kbn/embeddable-examples-plugin/public/react_embeddables/search/types';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { GridLayout, GridLayoutData } from '@kbn/grid-layout';
import { i18n } from '@kbn/i18n';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

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
  const [currentLayout, setCurrentLayout] = useState<GridLayoutData>(
    dashboardInputToGridLayout(savedState.current)
  );

  const mockDashboardApi = useMockDashboardApi({ savedState: savedState.current });

  useEffect(() => {
    combineLatest([mockDashboardApi.panels$, mockDashboardApi.rows$])
      .pipe(debounceTime(0)) // debounce to avoid subscribe being called twice when both panels$ and rows$ publish
      .subscribe(([panels, rows]) => {
        const hasChanges = !(
          deepEqual(
            Object.values(panels).map(({ gridData }) => ({ row: 0, ...gridData })),
            Object.values(savedState.current.panels).map(({ gridData }) => ({
              row: 0, // if row is undefined, then default to 0
              ...gridData,
            }))
          ) && deepEqual(rows, savedState.current.rows)
        );
        setHasUnsavedChanges(hasChanges);
        setCurrentLayout(dashboardInputToGridLayout({ panels, rows }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPanelContents = useCallback(
    (id: string, setDragHandles: (refs: Array<HTMLElement | null>) => void) => {
      const currentPanels = mockDashboardApi.panels$.getValue();

      return (
        <ReactEmbeddableRenderer<SearchSerializedState, SearchApi>
          key={id}
          maybeId={id}
          type={currentPanels[id].type}
          getParentApi={() => mockDashboardApi}
          panelProps={{
            showBadges: true,
            showBorder: true,
            showNotifications: true,
            showShadow: false,
            setDragHandles,
          }}
        />
      );
    },
    [mockDashboardApi]
  );

  return (
    <KibanaRenderContextProvider {...coreStart}>
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
            layout={currentLayout}
            gridSettings={{
              gutterSize: DASHBOARD_MARGIN_SIZE,
              rowHeight: DASHBOARD_GRID_HEIGHT,
              columnCount: DASHBOARD_GRID_COLUMN_COUNT,
            }}
            renderPanelContents={renderPanelContents}
            onLayoutChange={(newLayout) => {
              const { panels, rows } = gridLayoutToDashboardPanelMap(
                mockDashboardApi.panels$.getValue(),
                newLayout
              );
              mockDashboardApi.panels$.next(panels);
              mockDashboardApi.rows$.next(rows);
            }}
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </KibanaRenderContextProvider>
  );
};

export const renderGridExampleApp = (
  element: AppMountParameters['element'],
  coreStart: CoreStart
) => {
  ReactDOM.render(<GridExample coreStart={coreStart} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
