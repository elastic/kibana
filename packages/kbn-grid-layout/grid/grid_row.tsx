/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef } from 'react';

import { EuiButtonIcon, EuiFlexGroup, EuiSpacer, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';

import { GridPanel } from './grid_panel';
import { GridLayoutStateManager, PanelInteractionEvent } from './types';

export const GridRow = forwardRef<
  HTMLDivElement,
  {
    rowIndex: number;
    toggleIsCollapsed: () => void;
    renderPanelContents: (panelId: string) => React.ReactNode;
    setInteractionEvent: (interactionData?: PanelInteractionEvent) => void;
    gridLayoutStateManager: GridLayoutStateManager;
  }
>(
  (
    {
      rowIndex,
      toggleIsCollapsed,
      renderPanelContents,
      setInteractionEvent,
      gridLayoutStateManager,
    },
    gridRef
  ) => {
    const rowData = useStateFromPublishingSubject(gridLayoutStateManager.rows$[rowIndex]);
    console.log('rowData', rowData);

    return (
      <>
        {rowIndex !== 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s">
              <EuiButtonIcon
                color="text"
                aria-label={i18n.translate('kbnGridLayout.row.toggleCollapse', {
                  defaultMessage: 'Toggle collapse',
                })}
                iconType={rowData.isCollapsed ? 'arrowRight' : 'arrowDown'}
                onClick={toggleIsCollapsed}
              />
              <EuiTitle size="xs">
                <h2>{rowData.title}</h2>
              </EuiTitle>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        )}
        {!rowData.isCollapsed && (
          <div
            ref={gridRef}
            css={css`
              display: grid;
              justify-items: stretch;
              transition: background-color 300ms linear;
            `}
          >
            {Object.values(rowData.panelIds).map((panelId) => (
              <GridPanel
                key={panelId}
                panelId={panelId}
                renderPanelContents={renderPanelContents}
                interactionStart={(type, e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const panelRef = gridLayoutStateManager.panelRefs.current[rowIndex][panelId];
                  if (!panelRef) return;

                  const panelRect = panelRef.getBoundingClientRect();
                  setInteractionEvent({
                    type,
                    id: panelId,
                    panelDiv: panelRef,
                    targetRowIndex: rowIndex,
                    mouseOffsets: {
                      top: e.clientY - panelRect.top,
                      left: e.clientX - panelRect.left,
                      right: e.clientX - panelRect.right,
                      bottom: e.clientY - panelRect.bottom,
                    },
                  });
                }}
                ref={(element) => {
                  if (!gridLayoutStateManager.panelRefs.current[rowIndex]) {
                    gridLayoutStateManager.panelRefs.current[rowIndex] = {};
                  }
                  gridLayoutStateManager.panelRefs.current[rowIndex][panelId] = element;
                }}
              />
            ))}

            {/* render the drag preview if this row is currently being targetted */}
            {isGridTargeted && (
              <div
                ref={dragPreviewRef}
                css={css`
                  pointer-events: none;
                  border-radius: ${euiThemeVars.euiBorderRadius};
                  background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.2)};
                  transition: opacity 100ms linear;

                  grid-column-start: ${rowData.panels[activePanel.id].column + 1};
                  grid-column-end: ${rowData.panels[activePanel.id].column +
                  1 +
                  rowData.panels[activePanel.id].width};
                  grid-row-start: ${rowData.panels[activePanel.id].row + 1};
                  grid-row-end: ${rowData.panels[activePanel.id].row +
                  1 +
                  rowData.panels[activePanel.id].height};
                `}
              />
            )}
          </div>
        )}
      </>
    );
  }
);
