/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { combineLatest } from 'rxjs';
import { cloneDeep } from 'lodash';

import { css } from '@emotion/react';

import { GridHeightSmoother } from './grid_height_smoother';
import { GridPanel, GridPanelDragPreview } from './grid_panel';
import {
  GridSectionDragPreview,
  GridSectionFooter,
  GridSectionHeader,
  GridSectionWrapper,
} from './grid_section';
import { GridAccessMode, GridLayoutData, GridSettings, UseCustomDragHandle } from './types';
import { GridLayoutContext, GridLayoutContextType } from './use_grid_layout_context';
import { useGridLayoutState } from './use_grid_layout_state';
import {
  getPanelKeysInOrder,
  getSectionsInOrder,
  resolveGridSection,
} from './utils/resolve_grid_section';
import { getOrderedLayout } from './utils/conversions';
import { isOrderedLayoutEqual } from './utils/equality_checks';

export type GridLayoutProps = {
  layout: GridLayoutData;
  gridSettings: GridSettings;
  onLayoutChange: (newLayout: GridLayoutData) => void;
  expandedPanelId?: string;
  accessMode?: GridAccessMode;
  className?: string; // this makes it so that custom CSS can be passed via Emotion
} & UseCustomDragHandle;

type GridLayoutElementsInOrder = Array<{
  type: 'header' | 'footer' | 'panel' | 'wrapper';
  id: string;
}>;

export const GridLayout = ({
  layout,
  gridSettings,
  renderPanelContents,
  onLayoutChange,
  expandedPanelId,
  accessMode = 'EDIT',
  className,
  useCustomDragHandle = false,
}: GridLayoutProps) => {
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const { gridLayoutStateManager, setDimensionsRef } = useGridLayoutState({
    layout,
    layoutRef,
    gridSettings,
    expandedPanelId,
    accessMode,
  });
  const [elementsInOrder, setElementsInOrder] = useState<GridLayoutElementsInOrder>([]);

  /**
   * Update the `gridLayout$` behaviour subject in response to the `layout` prop changing
   */
  useEffect(() => {
    const orderedLayout = getOrderedLayout(layout);
    if (!isOrderedLayoutEqual(orderedLayout, gridLayoutStateManager.gridLayout$.getValue())) {
      const newLayout = cloneDeep(orderedLayout);
      /**
       * the layout sent in as a prop is not guaranteed to be valid (i.e it may have floating panels) -
       * so, we need to loop through each row and ensure it is compacted
       */
      Object.entries(newLayout).forEach(([sectionId, row]) => {
        newLayout[sectionId].panels = resolveGridSection(row.panels);
      });
      gridLayoutStateManager.gridLayout$.next(newLayout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  useEffect(() => {
    /**
     * This subscription calls the passed `onLayoutChange` callback when the layout changes
     */
    const onLayoutChangeSubscription = gridLayoutStateManager.layoutUpdated$.subscribe(
      (newLayout) => {
        onLayoutChange(newLayout);
      }
    );
    return () => {
      onLayoutChangeSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLayoutChange]);

  useEffect(() => {
    /**
     * This subscription sets the rendered elements and the `gridTemplateString`,
     * which defines the grid layout structure as follows:
     * - Each grid section has two named grid lines: `start-<sectionId>` and `end-<sectionId>`,
     *   marking the start and end of the section. Headers and footers are positioned relative to these lines.
     * - Grid rows are named `gridRow-<sectionId>`, and panels are positioned relative to these lines.
     */
    const renderSubscription = gridLayoutStateManager.gridLayout$.subscribe((sections) => {
      const currentElementsInOrder: GridLayoutElementsInOrder = [];
      let gridTemplateString = '';

      getSectionsInOrder(sections).forEach((section) => {
        const { id } = section;

        /** Header */
        if (!section.isMainSection) {
          currentElementsInOrder.push({ type: 'header', id });
          gridTemplateString += `auto `;
        }

        /** Panels */
        gridTemplateString += `[start-${id}] `;
        if (Object.keys(section.panels).length && (section.isMainSection || !section.isCollapsed)) {
          let maxRow = 0;
          getPanelKeysInOrder(section.panels).forEach((panelId) => {
            const panel = section.panels[panelId];
            maxRow = Math.max(maxRow, panel.row + panel.height);
            currentElementsInOrder.push({
              type: 'panel',
              id: panel.id,
            });
          });
          gridTemplateString += `repeat(${maxRow}, [gridRow-${id}] calc(var(--kbnGridRowHeight) * 1px)) `;
          currentElementsInOrder.push({
            type: 'wrapper',
            id,
          });
        }
        gridTemplateString += `[end-${section.id}] `;

        /** Footer */
        if (!section.isMainSection) {
          currentElementsInOrder.push({ type: 'footer', id });
          gridTemplateString += `auto `;
        }
      });

      setElementsInOrder(currentElementsInOrder);
      gridTemplateString = gridTemplateString.replaceAll('] [', ' ');
      if (layoutRef.current) layoutRef.current.style.gridTemplateRows = gridTemplateString;
    });

    /**
     * This subscription adds and/or removes the necessary class names related to styling for
     * mobile view and a static (non-interactable) grid layout
     */
    const gridLayoutClassSubscription = combineLatest([
      gridLayoutStateManager.accessMode$,
      gridLayoutStateManager.isMobileView$,
    ]).subscribe(([currentAccessMode, isMobileView]) => {
      if (!layoutRef) return;

      if (isMobileView) {
        layoutRef.current?.classList.add('kbnGrid--mobileView');
      } else {
        layoutRef.current?.classList.remove('kbnGrid--mobileView');
      }

      if (currentAccessMode === 'VIEW') {
        layoutRef.current?.classList.add('kbnGrid--static');
      } else {
        layoutRef.current?.classList.remove('kbnGrid--static');
      }
    });

    return () => {
      renderSubscription.unsubscribe();
      gridLayoutClassSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memoizedContext = useMemo(
    () =>
      ({
        renderPanelContents,
        useCustomDragHandle,
        gridLayoutStateManager,
      } as GridLayoutContextType),
    [renderPanelContents, useCustomDragHandle, gridLayoutStateManager]
  );

  return (
    <GridLayoutContext.Provider value={memoizedContext}>
      <GridHeightSmoother>
        <div
          data-test-subj="kbnGridLayout"
          ref={(divElement) => {
            layoutRef.current = divElement;
            setDimensionsRef(divElement);
          }}
          className={classNames('kbnGrid', className)}
          css={[styles.layout, styles.hasActivePanel, styles.singleColumn, styles.hasExpandedPanel]}
        >
          {elementsInOrder.map((element) => {
            switch (element.type) {
              case 'header':
                return <GridSectionHeader key={element.id} sectionId={element.id} />;
              case 'panel':
                return <GridPanel key={element.id} panelId={element.id} />;
              case 'wrapper':
                return <GridSectionWrapper key={`${element.id}--wrapper`} sectionId={element.id} />;
              case 'footer':
                return <GridSectionFooter key={`${element.id}--footer`} sectionId={element.id} />;
            }
          })}
          <GridPanelDragPreview />
          <GridSectionDragPreview />
        </div>
      </GridHeightSmoother>
    </GridLayoutContext.Provider>
  );
};

const styles = {
  layout: css({
    display: 'grid',
    gap: 'calc(var(--kbnGridGutterSize) * 1px)',
    padding: 'calc(var(--kbnGridGutterSize) * 1px)',
    gridAutoRows: 'calc(var(--kbnGridRowHeight) * 1px)',
    gridTemplateColumns: `repeat(
          var(--kbnGridColumnCount),
          calc(
            (100% - (var(--kbnGridGutterSize) * (var(--kbnGridColumnCount) - 1) * 1px)) /
              var(--kbnGridColumnCount)
          )
        )`,
  }),
  hasActivePanel: css({
    '&:has(.kbnGridPanel--active), &:has(.kbnGridSectionHeader--active)': {
      // disable pointer events and user select on drag + resize
      userSelect: 'none',
      pointerEvents: 'none',
    },
  }),
  singleColumn: css({
    '&.kbnGrid--mobileView': {
      gridTemplateColumns: '100%',
      gridTemplateRows: 'auto !important',
      gridAutoFlow: 'row',
      gridAutoRows: 'auto',
      '.kbnGridPanel, .kbnGridSectionHeader': {
        gridArea: 'unset !important',
      },
    },
  }),
  hasExpandedPanel: css({
    ':has(.kbnGridPanel--expanded)': {
      height: '100%',
      display: 'block',
      paddingBottom: 'calc(var(--kbnGridGutterSize) * 1px) !important',
      '.kbnGridSectionHeader, .kbnGridSectionFooter': {
        height: '0px', // better than 'display: none' for a11y – header may hold info relevant to the expanded panel
        padding: '0px',
        display: 'block',
        overflow: 'hidden',
      },
      '.kbnGridSectionFooter': {
        visibility: 'hidden',
      },
      '.kbnGridPanel': {
        '&.kbnGridPanel--expanded': {
          height: '100% !important',
        },
        // hide the non-expanded panels
        '&:not(.kbnGridPanel--expanded)': {
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          visibility: 'hidden', // remove hidden panels and their contents from tab order for a11y
        },
      },
    },
  }),
};
