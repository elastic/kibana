/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { useEffect, useRef } from 'react';
import { combineLatest } from 'rxjs';
import { useGridLayoutContext } from './use_grid_layout_context';

export const GridHeightSmoother = React.memo(
  ({ children }: { children: React.ReactNode | undefined }) => {
    const { gridLayoutStateManager } = useGridLayoutContext();

    // set the parent div size directly to smooth out height changes.
    const smoothHeightRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      /**
       * When the user is interacting with an element, the page can grow, but it cannot
       * shrink. This is to stop a behaviour where the page would scroll up automatically
       * making the panel shrink or grow unpredictably.
       */
      const interactionStyleSubscription = combineLatest([
        gridLayoutStateManager.gridDimensions$,
        gridLayoutStateManager.interactionEvent$,
      ]).subscribe(([dimensions, interactionEvent]) => {
        if (!smoothHeightRef.current || gridLayoutStateManager.expandedPanelId$.getValue()) return;

        if (!interactionEvent) {
          smoothHeightRef.current.style.minHeight = `${dimensions.height}px`;
          return;
        }
        smoothHeightRef.current.style.minHeight = `${
          smoothHeightRef.current.getBoundingClientRect().height
        }px`;
      });

      return () => {
        interactionStyleSubscription.unsubscribe();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div
        ref={smoothHeightRef}
        className={'kbnGridWrapper'}
        css={[styles.heightSmoothing, styles.hasActivePanel]}
      >
        {children}
      </div>
    );
  }
);

const styles = {
  heightSmoothing: css({
    height: '100%',
    overflowAnchor: 'none',
    transition: 'min-height 500ms linear',
  }),
  hasActivePanel: css({
    '&:has(.kbnGridPanel--expanded)': {
      minHeight: '100% !important',
      maxHeight: '100vh', // fallback in case if the parent doesn't set the height correctly
      position: 'relative',
      transition: 'none',
    },
  }),
};

GridHeightSmoother.displayName = 'KbnGridLayoutHeightSmoother';
