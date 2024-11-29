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
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import { GridLayoutStateManager } from './types';

export const GridHeightSmoother = ({
  children,
  gridLayoutStateManager,
}: PropsWithChildren<{ gridLayoutStateManager: GridLayoutStateManager }>) => {
  // set the parent div size directly to smooth out height changes.
  const smoothHeightRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const interactionStyleSubscription = combineLatest([
      gridLayoutStateManager.gridDimensions$,
      gridLayoutStateManager.interactionEvent$,
    ]).subscribe(([dimensions, interactionEvent]) => {
      if (!smoothHeightRef.current) return;
      if (gridLayoutStateManager.expandedPanelId$.getValue()) {
        return;
      }
      if (!interactionEvent) {
        smoothHeightRef.current.style.height = `${dimensions.height}px`;
        smoothHeightRef.current.style.userSelect = 'auto';
        return;
      }

      /**
       * When the user is interacting with an element, the page can grow, but it cannot
       * shrink. This is to stop a behaviour where the page would scroll up automatically
       * making the panel shrink or grow unpredictably.
       */
      smoothHeightRef.current.style.height = `${Math.max(
        dimensions.height ?? 0,
        smoothHeightRef.current.getBoundingClientRect().height
      )}px`;
      smoothHeightRef.current.style.userSelect = 'none';
    });

    const paddingSubscription = gridLayoutStateManager.runtimeSettings$
      .pipe(
        map(({ gutterSize }) => gutterSize),
        distinctUntilChanged()
      )
      .subscribe((gutterSize) => {
        if (!smoothHeightRef.current) return;
        smoothHeightRef.current.style.padding = `${gutterSize}px`;
      });

    const expandedPanelSubscription = gridLayoutStateManager.expandedPanelId$.subscribe(
      (expandedPanelId) => {
        if (!smoothHeightRef.current) return;

        if (expandedPanelId) {
          const smoothHeightRefY =
            smoothHeightRef.current.getBoundingClientRect().y + document.documentElement.scrollTop;
          const { gutterSize } = gridLayoutStateManager.runtimeSettings$.getValue();

          // When panel is expanded, ensure the page occupies the full viewport height
          // If the parent element is a flex container (preferred approach):
          smoothHeightRef.current.style.flexBasis = `100%`;

          // fallback in case parent is not a flex container (less reliable if shifts happen after the time we calculate smoothHeightRefY)
          smoothHeightRef.current.style.height = `calc(100vh - ${smoothHeightRefY + gutterSize}px`;
          smoothHeightRef.current.style.transition = 'none';
        } else {
          smoothHeightRef.current.style.flexBasis = '';
          smoothHeightRef.current.style.height = '';
          smoothHeightRef.current.style.transition = '';
        }
      }
    );
    return () => {
      interactionStyleSubscription.unsubscribe();
      paddingSubscription.unsubscribe();
      expandedPanelSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={smoothHeightRef}
      css={css`
        overflow-anchor: none;
        transition: height 500ms linear;
      `}
    >
      {children}
    </div>
  );
};
