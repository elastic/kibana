/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PropsWithChildren, useEffect, useRef } from 'react';
import { GridLayoutStateManager } from './types';
import { auditTime } from 'rxjs';
import React from 'react';
import { css } from '@emotion/react';

export const GridHeightSmoother = ({
  children,
  gridLayoutStateManager,
}: PropsWithChildren<{ gridLayoutStateManager: GridLayoutStateManager }>) => {
  // set the parent div size directly to smooth out height changes.
  const smoothHeightRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    // audit height changes to avoid fast scrolling when the user resizes a panel at the bottom of the scroll context.
    const subscription = gridLayoutStateManager.gridDimensions$
      .pipe(auditTime(500))
      .subscribe((dimensions) => {
        if (!smoothHeightRef.current) {
          // do not resize page when the user is resizing a panel.
          return;
        }
        smoothHeightRef.current.style.height = `${dimensions.height}px`;
      });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div
      ref={smoothHeightRef}
      css={css`
        overflow: clip;
        overflow-anchor: none;
        overflow-clip-margin: 100px;
        transition: height 500ms linear;
      `}
    >
      {children}
    </div>
  );
};
