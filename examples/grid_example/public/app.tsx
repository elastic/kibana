/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { cloneDeep } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Subject, combineLatest, debounceTime, map, skip, take } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  UseEuiTheme,
  transparentize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AppMountParameters } from '@kbn/core-application-browser';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { AddEmbeddableButton } from '@kbn/embeddable-examples-plugin/public';
import { ReactEmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { GridLayout, GridLayoutData, GridSettings } from '@kbn/grid-layout';
import { i18n } from '@kbn/i18n';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';

import { GridLayoutOptions } from './grid_layout_options';
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
const DASHBOARD_DRAG_TOP_OFFSET = 150;

export const GridExample = ({
  coreStart,
  uiActions,
}: {
  coreStart: CoreStart;
  uiActions: UiActionsStart;
}) => {
  const savedState = useRef<MockSerializedDashboardState>(getSerializedDashboardState());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [currentLayout, setCurrentLayout] = useState<GridLayoutData>(
    dashboardInputToGridLayout(savedState.current)
  );
  const [gridSettings, setGridSettings] = useState<GridSettings>({
    gutterSize: DASHBOARD_MARGIN_SIZE,
    rowHeight: DASHBOARD_GRID_HEIGHT,
    columnCount: DASHBOARD_GRID_COLUMN_COUNT,
    keyboardDragTopLimit: DASHBOARD_DRAG_TOP_OFFSET,
  });

  const mockDashboardApi = useMockDashboardApi({ savedState: savedState.current });
  const [viewMode, expandedPanelId] = useBatchedPublishingSubjects(
    mockDashboardApi.viewMode$,
    mockDashboardApi.expandedPanelId$
  );
  const layoutUpdated$ = useMemo(() => new Subject<void>(), []);

  useEffect(() => {
    combineLatest([mockDashboardApi.panels$, mockDashboardApi.rows$])
      .pipe(
        debounceTime(0), // debounce to avoid subscribe being called twice when both panels$ and rows$ publish
        map(([panels, rows]) => {
          const panelIds = Object.keys(panels);
          let panelsAreEqual = true;
          for (const panelId of panelIds) {
            if (!panelsAreEqual) break;
            const currentPanel = panels[panelId];
            const savedPanel = savedState.current.panels[panelId];
            panelsAreEqual = deepEqual(
              { row: 'first', ...currentPanel?.gridData },
              { row: 'first', ...savedPanel?.gridData }
            );
          }
          const hasChanges = !(panelsAreEqual && deepEqual(rows, savedState.current.rows));
          return { hasChanges, updatedLayout: dashboardInputToGridLayout({ panels, rows }) };
        })
      )
      .subscribe(({ hasChanges, updatedLayout }) => {
        setHasUnsavedChanges(hasChanges);
        setCurrentLayout(updatedLayout);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * On layout update, emit `layoutUpdated$` so that side effects to layout updates can
   * happen (such as scrolling to the bottom of the screen after adding a new section)
   */
  useEffect(() => {
    layoutUpdated$.next();
  }, [currentLayout, layoutUpdated$]);

  const renderPanelContents = useCallback(
    (id: string, setDragHandles?: (refs: Array<HTMLElement | null>) => void) => {
      // const currentPanels = mockDashboardApi.panels$.getValue();

      return (
        <EuiPanel
          hasBorder={true}
          hasShadow={false}
          css={css({
            height: '100%',
            backgroundColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
          })}
        >
          {id}
        </EuiPanel>
        // <ReactEmbeddableRenderer
        //   key={id}
        //   maybeId={id}
        //   type={currentPanels[id].type}
        //   getParentApi={() => mockDashboardApi}
        //   panelProps={{
        //     showBadges: true,
        //     showBorder: true,
        //     showNotifications: true,
        //     showShadow: false,
        //     setDragHandles,
        //   }}
        // />
      );
    },
    [mockDashboardApi]
  );

  const onLayoutChange = useCallback(
    (newLayout: GridLayoutData) => {
      const { panels, rows } = gridLayoutToDashboardPanelMap(
        mockDashboardApi.panels$.getValue(),
        newLayout
      );
      mockDashboardApi.panels$.next(panels);
      mockDashboardApi.rows$.next(rows);
    },
    [mockDashboardApi.panels$, mockDashboardApi.rows$]
  );

  const addNewSection = useCallback(() => {
    const rows = cloneDeep(mockDashboardApi.rows$.getValue());
    const id = uuidv4();
    rows[id] = {
      id,
      order: Object.keys(rows).length,
      title: i18n.translate('examples.gridExample.defaultSectionTitle', {
        defaultMessage: 'New collapsible section',
      }),
      collapsed: false,
    };
    mockDashboardApi.rows$.next(rows);

    // scroll to bottom after row is added
    layoutUpdated$.pipe(skip(1), take(1)).subscribe(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  }, [mockDashboardApi.rows$, layoutUpdated$]);

  const resetUnsavedChanges = useCallback(() => {
    const { panels, rows } = savedState.current;
    mockDashboardApi.panels$.next(panels);
    mockDashboardApi.rows$.next(rows);
  }, [mockDashboardApi.panels$, mockDashboardApi.rows$]);

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
                  <AddEmbeddableButton pageApi={mockDashboardApi} uiActions={uiActions} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton onClick={addNewSection} disabled={viewMode !== 'edit'}>
                    {i18n.translate('examples.gridExample.addRowButton', {
                      defaultMessage: 'Add collapsible section',
                    })}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <GridLayoutOptions
                    mockDashboardApi={mockDashboardApi}
                    gridSettings={gridSettings}
                    setGridSettings={setGridSettings}
                    viewMode={viewMode}
                  />
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
                  <EuiButtonEmpty onClick={resetUnsavedChanges}>
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
            gridSettings={gridSettings}
            renderPanelContents={renderPanelContents}
            onLayoutChange={onLayoutChange}
            css={layoutStyles}
            useCustomDragHandle={false}
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

const layoutStyles = ({ euiTheme }: UseEuiTheme) => {
  const gridColor = transparentize(euiTheme.colors.backgroundFilledAccentSecondary, 0.2);
  return css({
    // background for grid row that is being targetted
    '.kbnGridSection--targeted': {
      backgroundPosition: `top calc((var(--kbnGridGutterSize) / 2) * -1px) left calc((var(--kbnGridGutterSize) / 2) * -1px)`,
      backgroundSize: `calc((var(--kbnGridColumnWidth) + var(--kbnGridGutterSize)) * 1px) calc((var(--kbnGridRowHeight) + var(--kbnGridGutterSize)) * 1px)`,
      backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
      backgroundColor: `${transparentize(euiTheme.colors.backgroundFilledAccentSecondary, 0.1)}`,
    },
    // styling for the "locked to grid" preview for what the panel will look like when dropped / resized
    '.kbnGridPanel--dragPreview': {
      borderRadius: `${euiTheme.border.radius}`,
      backgroundColor: `${transparentize(euiTheme.colors.backgroundFilledAccentSecondary, 0.2)}`,
      transition: `opacity 100ms linear`,
    },
    // styling for panel resize handle
    '.kbnGridPanel--resizeHandle': {
      opacity: '0',
      transition: `opacity 0.2s, border 0.2s`,
      borderRadius: `7px 0 7px 0`,
      borderBottom: `2px solid ${euiTheme.colors.accentSecondary}`,
      borderRight: `2px solid ${euiTheme.colors.accentSecondary}`,
      '&:hover, &:focus': {
        outlineStyle: `none !important`,
        opacity: 1,
        backgroundColor: `${transparentize(euiTheme.colors.accentSecondary, 0.05)}`,
      },
    },
    // styling for what the grid row header looks like when being dragged
    '.kbnGridSectionHeader--active': {
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      outline: `1px solid ${euiTheme.border.color}`,
      borderRadius: `${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium}`,
      paddingLeft: '8px',
      // hide accordian arrow + panel count text when row is being dragged
      '& .kbnGridSectionTitle--button svg, & .kbnGridLayout--panelCount': {
        display: 'none',
      },
    },
    // styles for the area where the row will be dropped
    '.kbnGridSection--dragPreview': {
      backgroundColor: euiTheme.components.dragDropDraggingBackground,
    },
  });
};
