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
  FlexLayoutSettings,
  UseCustomDragHandle,
} from './types';
import type { GridLayoutContextType } from './use_grid_layout_context';
import { GridLayoutContext } from './use_grid_layout_context';
import { useGridLayoutState } from './use_grid_layout_state';
import { getPanelKeysInOrder } from './utils/panel_order';

export type GridLayoutProps = {
  layout: FlexLayoutData;
  gridSettings: FlexLayoutSettings;
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
  const [panelIds, setPanelIds] = useState(() => getPanelKeysInOrder(layout));

  /**
   * Update the `gridLayout$` behaviour subject in response to the `layout` prop changing
   */
  useEffect(() => {
    if (!isEqual(layout, gridLayoutStateManager.gridLayout$.getValue())) {
      gridLayoutStateManager.gridLayout$.next(cloneDeep(layout));
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
     * This subscription sets the rendered elements in the order they should appear
     */
    const renderSubscription = gridLayoutStateManager.gridLayout$.subscribe((panels) => {
      const nextIds = getPanelKeysInOrder(panels);
      // keep the same reference when the order is unchanged to avoid re-rendering during interactions
      setPanelIds((currentIds) => (isEqual(currentIds, nextIds) ? currentIds : nextIds));
    });

    return () => {
      renderSubscription.unsubscribe();
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
        data-test-subj="kbnFlexLayout"
        role="list"
        ref={(divElement) => {
          layoutRef.current = divElement;
          setDimensionsRef(divElement);
        }}
        className={classNames('kbnFlex', { 'kbnFlex--static': accessMode === 'VIEW' }, className)}
        css={[styles.layout, styles.hasActivePanel]}
      >
        {panelIds.map((id) => (
          <GridPanel key={id} panelId={id} />
        ))}
        <GridPanelDragPreview />
      </div>
    </GridLayoutContext.Provider>
  );
};

const styles = {
  layout: css({
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'left',
    gap: 'calc(var(--kbnFlexGutterSize) * 1px)',
    padding: 'calc(var(--kbnFlexGutterSize) * 1px)',
    minHeight: 'calc(var(--kbnFlexRowHeight) * 1px)',
  }),
  hasActivePanel: css({
    '&:has(.kbnFlexPanel--active)': {
      // disable pointer events and user select on drag + resize
      userSelect: 'none',
      pointerEvents: 'none',
    },
  }),
};
