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
import { cloneDeep, isEqual } from 'lodash';

import { css } from '@emotion/react';

import { GridPanel, GridPanelDragPreview } from './grid_panel';
import type {
  GridAccessMode,
  FlexLayoutData,
  GridSettings,
  UseCustomDragHandle,
  FlexLayoutElementsInOrder,
} from './types';
import type { GridLayoutContextType } from './use_grid_layout_context';
import { GridLayoutContext } from './use_grid_layout_context';
import { useGridLayoutState } from './use_grid_layout_state';
import { getLayoutInOrder } from './utils/resolve_grid_section';

export type GridLayoutProps = {
  layout: FlexLayoutData;
  gridSettings: GridSettings;
  onLayoutChange: (newLayout: FlexLayoutData) => void;
  accessMode?: GridAccessMode;
  className?: string; // this makes it so that custom CSS can be passed via Emotion
} & UseCustomDragHandle;

export const FlexLayout = ({
  layout,
  gridSettings,
  renderPanelContents,
  onLayoutChange,
  accessMode = 'EDIT',
  className,
  useCustomDragHandle = false,
}: GridLayoutProps) => {
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const { gridLayoutStateManager, setDimensionsRef } = useGridLayoutState({
    layout,
    layoutRef,
    gridSettings,
    accessMode,
  });
  const [elementsInOrder, setElementsInOrder] = useState<FlexLayoutElementsInOrder>([]);
  console.log({ layout, elementsInOrder });
  /**
   * Update the `gridLayout$` behaviour subject in response to the `layout` prop changing
   */
  useEffect(() => {
    if (!isEqual(layout, gridLayoutStateManager.gridLayout$.getValue())) {
      const newLayout = cloneDeep(layout);
      /**
       * the layout sent in as a prop is not guaranteed to be valid (i.e it may have floating panels) -
       * so, we need to loop through each row and ensure it is compacted
       */
      // Object.entries(newLayout).forEach(([sectionId, row]) => {
      //   newLayout[sectionId].panels = resolveGridSection(row.panels);
      // });
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
    const renderSubscription = gridLayoutStateManager.gridLayout$.subscribe((panels) => {
      console.log({ panels, test: getLayoutInOrder(panels) });
      setElementsInOrder(getLayoutInOrder(panels));
    });

    /**
     * This subscription adds and/or removes the necessary class names related to styling for
     * mobile view and a static (non-interactable) grid layout
     */
    const gridLayoutClassSubscription = gridLayoutStateManager.accessMode$.subscribe(
      (currentAccessMode) => {
        if (!layoutRef) return;
        if (currentAccessMode === 'VIEW') {
          layoutRef.current?.classList.add('kbnGrid--static');
        } else {
          layoutRef.current?.classList.remove('kbnGrid--static');
        }
      }
    );

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
      <div
        data-test-subj="kbnGridLayout"
        ref={(divElement) => {
          layoutRef.current = divElement;
          setDimensionsRef(divElement);
        }}
        className={classNames('kbnGrid', className)}
        css={[styles.layout, styles.hasActivePanel]}
      >
        {elementsInOrder.map((element) => {
          return <GridPanel key={element.id} panelId={element.id} />;
        })}
        <GridPanelDragPreview />
      </div>
    </GridLayoutContext.Provider>
  );
};

const styles = {
  layout: css({
    display: 'flex',
    gap: 'calc(var(--kbnGridGutterSize) * 1px)',
    padding: 'calc(var(--kbnGridGutterSize) * 1px)',
    // height: 'calc(var(--kbnGridRowHeight) * 1px)',
    // gridAutoRows: 'calc(var(--kbnGridRowHeight) * 1px)',
    // gridTemplateColumns: `repeat(
    //       var(--kbnGridColumnCount),
    //       calc(
    //         (100% - (var(--kbnGridGutterSize) * (var(--kbnGridColumnCount) - 1) * 1px)) /
    //           var(--kbnGridColumnCount)
    //       )
    //     )`,
  }),
  hasActivePanel: css({
    '&:has(.kbnGridPanel--active), &:has(.kbnGridSectionHeader--active)': {
      // disable pointer events and user select on drag + resize
      userSelect: 'none',
      pointerEvents: 'none',
    },
  }),
};
