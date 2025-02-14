/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { combineLatest, debounceTime } from 'rxjs';

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPageTemplate,
  EuiPopover,
  EuiRange,
  EuiSpacer,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AppMountParameters } from '@kbn/core-application-browser';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { AddEmbeddableButton } from '@kbn/embeddable-examples-plugin/public';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { GridLayout, GridLayoutData } from '@kbn/grid-layout';
import { i18n } from '@kbn/i18n';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';

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

export const GridExample = ({
  coreStart,
  uiActions,
}: {
  coreStart: CoreStart;
  uiActions: UiActionsStart;
}) => {
  const { euiTheme } = useEuiTheme();

  const savedState = useRef<MockSerializedDashboardState>(getSerializedDashboardState());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [currentLayout, setCurrentLayout] = useState<GridLayoutData>(
    dashboardInputToGridLayout(savedState.current)
  );
  const [isSettingsPopoverOpen, setIsSettingsPopoverOpen] = useState(false);
  const [gutterSize, setGutterSize] = useState<number>(DASHBOARD_MARGIN_SIZE);
  const [rowHeight, setRowHeight] = useState<number>(DASHBOARD_GRID_HEIGHT);

  const mockDashboardApi = useMockDashboardApi({ savedState: savedState.current });
  const [viewMode, expandedPanelId] = useBatchedPublishingSubjects(
    mockDashboardApi.viewMode$,
    mockDashboardApi.expandedPanelId$
  );

  useEffect(() => {
    combineLatest([mockDashboardApi.panels$, mockDashboardApi.rows$])
      .pipe(debounceTime(0)) // debounce to avoid subscribe being called twice when both panels$ and rows$ publish
      .subscribe(([panels, rows]) => {
        const panelIds = Object.keys(panels);
        let panelsAreEqual = true;
        for (const panelId of panelIds) {
          if (!panelsAreEqual) break;
          const currentPanel = panels[panelId];
          const savedPanel = savedState.current.panels[panelId];
          panelsAreEqual = deepEqual(
            { row: 0, ...currentPanel.gridData },
            { row: 0, ...savedPanel.gridData }
          );
        }

        const hasChanges = !(panelsAreEqual && deepEqual(rows, savedState.current.rows));
        setHasUnsavedChanges(hasChanges);
        setCurrentLayout(dashboardInputToGridLayout({ panels, rows }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPanelContents = useCallback(
    (id: string, setDragHandles?: (refs: Array<HTMLElement | null>) => void) => {
      const currentPanels = mockDashboardApi.panels$.getValue();

      return (
        <ReactEmbeddableRenderer
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

  const customLayoutCss = useMemo(() => {
    const gridColor = transparentize(euiTheme.colors.backgroundFilledAccentSecondary, 0.2);
    return css`
      .kbnGridRow--targeted {
        background-position: top calc((var(--kbnGridGutterSize) / 2) * -1px) left
          calc((var(--kbnGridGutterSize) / 2) * -1px);
        background-size: calc((var(--kbnGridColumnWidth) + var(--kbnGridGutterSize)) * 1px)
          calc((var(--kbnGridRowHeight) + var(--kbnGridGutterSize)) * 1px);
        background-image: linear-gradient(to right, ${gridColor} 1px, transparent 1px),
          linear-gradient(to bottom, ${gridColor} 1px, transparent 1px);
        background-color: ${transparentize(euiTheme.colors.backgroundFilledAccentSecondary, 0.1)};
      }

      .kbnGridPanel--dragPreview {
        border-radius: ${euiTheme.border.radius};
        background-color: ${transparentize(euiTheme.colors.backgroundFilledAccentSecondary, 0.2)};
        transition: opacity 100ms linear;
      }

      .kbnGridPanel--resizeHandle {
        opacity: 0;
        transition: opacity 0.2s, border 0.2s;
        border-radius: 7px 0 7px 0;
        border-bottom: 2px solid ${euiTheme.colors.accentSecondary};
        border-right: 2px solid ${euiTheme.colors.accentSecondary};
        &:hover,
        &:focus {
          outline-style: none !important;
          opacity: 1;
          background-color: ${transparentize(euiTheme.colors.accentSecondary, 0.05)};
        }
      }
    `;
  }, [euiTheme]);

  return (
    <KibanaRenderContextProvider {...coreStart}>
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
            css: { flexGrow: 1, display: 'flex', flexDirection: 'column' },
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
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiFlexItem grow={false}>
                  <AddEmbeddableButton pageApi={mockDashboardApi} uiActions={uiActions} />{' '}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    button={
                      <EuiButton
                        iconType="arrowDown"
                        iconSide="right"
                        onClick={() => setIsSettingsPopoverOpen(!isSettingsPopoverOpen)}
                      >
                        {i18n.translate('examples.gridExample.settingsPopover.title', {
                          defaultMessage: 'Layout settings',
                        })}
                      </EuiButton>
                    }
                    isOpen={isSettingsPopoverOpen}
                    closePopover={() => setIsSettingsPopoverOpen(false)}
                  >
                    <>
                      <EuiFormRow
                        label={i18n.translate('examples.gridExample.settingsPopover.viewMode', {
                          defaultMessage: 'View mode',
                        })}
                      >
                        <EuiButtonGroup
                          legend={i18n.translate('examples.gridExample.layoutOptionsLegend', {
                            defaultMessage: 'Layout options',
                          })}
                          options={[
                            {
                              id: 'view',
                              label: i18n.translate('examples.gridExample.viewOption', {
                                defaultMessage: 'View',
                              }),
                              toolTipContent:
                                'The layout adjusts when the window is resized. Panel interactivity, such as moving and resizing within the grid, is disabled.',
                            },
                            {
                              id: 'edit',
                              label: i18n.translate('examples.gridExample.editOption', {
                                defaultMessage: 'Edit',
                              }),
                              toolTipContent:
                                'The layout does not adjust when the window is resized.',
                            },
                          ]}
                          idSelected={viewMode}
                          onChange={(id) => {
                            mockDashboardApi.viewMode$.next(id);
                          }}
                        />
                      </EuiFormRow>
                      <EuiFormRow
                        label={i18n.translate('examples.gridExample.settingsPopover.gutterSize', {
                          defaultMessage: 'Gutter size',
                        })}
                      >
                        <EuiRange
                          min={1}
                          max={30}
                          value={gutterSize}
                          onChange={(e) => setGutterSize(parseInt(e.currentTarget.value, 10))}
                          showLabels
                          showValue
                        />
                      </EuiFormRow>
                      <EuiFormRow
                        label={i18n.translate('examples.gridExample.settingsPopover.rowHeight', {
                          defaultMessage: 'Row height',
                        })}
                      >
                        <EuiRange
                          min={5}
                          max={30}
                          step={5}
                          value={rowHeight}
                          onChange={(e) => setRowHeight(parseInt(e.currentTarget.value, 10))}
                          showLabels
                          showValue
                        />
                      </EuiFormRow>
                    </>
                  </EuiPopover>
                </EuiFlexItem>
              </EuiFlexGroup>
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
            accessMode={viewMode === 'view' ? 'VIEW' : 'EDIT'}
            expandedPanelId={expandedPanelId}
            layout={currentLayout}
            gridSettings={{
              gutterSize,
              rowHeight,
              columnCount: DASHBOARD_GRID_COLUMN_COUNT,
            }}
            useCustomDragHandle={true}
            renderPanelContents={renderPanelContents}
            onLayoutChange={(newLayout) => {
              const { panels, rows } = gridLayoutToDashboardPanelMap(
                mockDashboardApi.panels$.getValue(),
                newLayout
              );
              mockDashboardApi.panels$.next(panels);
              mockDashboardApi.rows$.next(rows);
            }}
            css={customLayoutCss}
          />
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </KibanaRenderContextProvider>
  );
};

export const renderGridExampleApp = (
  element: AppMountParameters['element'],
  deps: { uiActions: UiActionsStart; coreStart: CoreStart }
) => {
  ReactDOM.render(<GridExample {...deps} />, element);

  return () => ReactDOM.unmountComponentAtNode(element);
};
