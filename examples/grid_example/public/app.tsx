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
import { Subject, combineLatest, debounceTime, map, take } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
  UseEuiTheme,
  transparentize,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { AppMountParameters } from '@kbn/core-application-browser';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { AddEmbeddableButton } from '@kbn/embeddable-examples-plugin/public';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
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
import { useLayoutStyles } from './use_layout_styles';
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
  const layoutStyles = useLayoutStyles();
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
    combineLatest([mockDashboardApi.panels$, mockDashboardApi.sections$])
      .pipe(
        debounceTime(0), // debounce to avoid subscribe being called twice when both panels$ and rows$ publish
        map(([panels, sections]) => {
          const panelIds = Object.keys(panels);
          let panelsAreEqual = true;
          for (const panelId of panelIds) {
            if (!panelsAreEqual) break;
            const currentPanel = panels[panelId];
            const savedPanel = savedState.current.panels[panelId];
            panelsAreEqual = deepEqual(currentPanel?.gridData, savedPanel?.gridData);
          }
          const hasChanges = !(panelsAreEqual && deepEqual(sections, savedState.current.sections));
          return { hasChanges, updatedLayout: dashboardInputToGridLayout({ panels, sections }) };
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
      const currentPanels = mockDashboardApi.panels$.getValue();

      return (
        <EmbeddableRenderer
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

  const onLayoutChange = useCallback(
    (newLayout: GridLayoutData) => {
      const { panels, sections } = gridLayoutToDashboardPanelMap(
        mockDashboardApi.panels$.getValue(),
        newLayout
      );
      mockDashboardApi.panels$.next(panels);
      mockDashboardApi.sections$.next(sections);
    },
    [mockDashboardApi.panels$, mockDashboardApi.sections$]
  );

  const addNewSection = useCallback(() => {
    const rows = cloneDeep(mockDashboardApi.sections$.getValue());
    const id = uuidv4();
    const maxY = Math.max(
      ...Object.values({
        ...mockDashboardApi.sections$.getValue(),
        ...mockDashboardApi.panels$.getValue(),
      }).map((widget) => ('gridData' in widget ? widget.gridData.y + widget.gridData.h : widget.y))
    );

    rows[id] = {
      id,
      y: maxY + 1,
      title: i18n.translate('examples.gridExample.defaultSectionTitle', {
        defaultMessage: 'New collapsible section',
      }),
      collapsed: false,
    };
    mockDashboardApi.sections$.next(rows);

    // scroll to bottom after row is added
    layoutUpdated$.pipe(take(1)).subscribe(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    });
  }, [mockDashboardApi.sections$, mockDashboardApi.panels$, layoutUpdated$]);

  const resetUnsavedChanges = useCallback(() => {
    const { panels, sections: rows } = savedState.current;
    mockDashboardApi.panels$.next(panels);
    mockDashboardApi.sections$.next(rows);
  }, [mockDashboardApi.panels$, mockDashboardApi.sections$]);

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
                        sections: mockDashboardApi.sections$.getValue(),
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
            css={[layoutStyles, customLayoutStyles]}
            useCustomDragHandle={true}
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

const customLayoutStyles = ({ euiTheme }: UseEuiTheme) => {
  return css({
    // removes the extra padding that EuiPageTemplate adds in order to make it look more similar to Dashboard
    marginLeft: `-${euiTheme.size.l}`,
    marginRight: `-${euiTheme.size.l}`,

    // styling for what the grid row header looks like when being dragged
    '.kbnGridSectionHeader--active': {
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      outline: `${euiTheme.border.width.thick} solid
        ${euiTheme.colors.vis.euiColorVis0}`,
      borderRadius: `${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium}`,
      paddingLeft: '8px',
      // hide accordian arrow + panel count text when row is being dragged
      '& .kbnGridSectionTitle--button svg, & .kbnGridLayout--panelCount': {
        display: 'none',
      },
    },
    // styles for the area where the row will be dropped
    '.kbnGridSection--dragPreview': {
      backgroundColor: transparentize(euiTheme.colors.vis.euiColorVis0, 0.2),
      borderRadius: `${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium}`,
    },

    '.kbnGridSectionFooter': {
      height: `${euiTheme.size.s}`,
      display: `block`,
      borderTop: `${euiTheme.border.thin}`,

      '&--targeted': {
        borderTop: `${euiTheme.border.width.thick} solid ${transparentize(
          euiTheme.colors.vis.euiColorVis0,
          0.5
        )}`,
      },
    },

    // hide border when section is being dragged
    '&:has(.kbnGridSectionHeader--active) .kbnGridSectionHeader--active + .kbnGridSectionFooter': {
      borderTop: `none`,
    },

    '.kbnGridSection--blocked': {
      zIndex: 1,
      backgroundColor: `${transparentize(euiTheme.colors.backgroundBaseSubdued, 0.5)}`,
      // the oulines of panels extend past 100% by 1px on each side, so adjust for that
      marginLeft: '-1px',
      marginTop: '-1px',
      width: `calc(100% + 2px)`,
      height: `calc(100% + 2px)`,
    },

    '&:has(.kbnGridSection--blocked) .kbnGridSection--dragHandle': {
      cursor: 'not-allowed !important',
    },
  });
};
