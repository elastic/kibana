/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React, { PropsWithChildren, useEffect, useRef } from 'react';
import { combineLatest } from 'rxjs';
import { GridLayoutStateManager } from './types';

export const GridHeightSmoother = ({
  children,
  gridLayoutStateManager,
}: PropsWithChildren<{ gridLayoutStateManager: GridLayoutStateManager }>) => {
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
        smoothHeightRef.current.style.userSelect = 'auto';
        return;
      }

      smoothHeightRef.current.style.minHeight = `${
        smoothHeightRef.current.getBoundingClientRect().height
      }px`;
      smoothHeightRef.current.style.userSelect = 'none';
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
      css={css`
        height: 100%;
        overflow-anchor: none;
        transition: min-height 500ms linear;

        &:has(.kbnGridPanel--expanded) {
          min-height: 100% !important;
          max-height: 100vh; // fallback in case if the parent doesn't set the height correctly
          position: relative;
          transition: none;
        }
      `}
    >
      {children}
    </div>
  );
};
