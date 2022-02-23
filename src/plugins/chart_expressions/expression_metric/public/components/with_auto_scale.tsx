/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, useEffect, useState, ComponentType, useMemo } from 'react';
import { throttle } from 'lodash';
import { useResizeObserver } from '@elastic/eui';
import { autoScaleWrapperStyle } from './with_auto_scale.styles';

interface AutoScaleParams {
  minScale?: number;
}
interface ClientDimensionable {
  clientWidth: number;
  clientHeight: number;
}

const MAX_SCALE = 1;
const MIN_SCALE = 0.3;

/**
 * computeScale computes the ratio by which the child needs to shrink in order
 * to fit into the parent. This function is only exported for testing purposes.
 */
export function computeScale(
  parent: ClientDimensionable | null,
  child: ClientDimensionable | null,
  minScale: number = MIN_SCALE
) {
  if (!parent || !child) {
    return 1;
  }

  const scaleX = parent.clientWidth / child.clientWidth;
  const scaleY = parent.clientHeight / child.clientHeight;

  return Math.max(Math.min(MAX_SCALE, Math.min(scaleX, scaleY)), minScale);
}

export function withAutoScale<T>(
  WrappedComponent: ComponentType<T>,
  autoScaleParams?: AutoScaleParams
) {
  return (props: T) => {
    // An initial scale of 0 means we always redraw
    // at least once, which is sub-optimal, but it
    // prevents an annoying flicker.
    const [scale, setScale] = useState(0);
    const parentRef = useRef<HTMLDivElement>(null);
    const childrenRef = useRef<HTMLDivElement>(null);
    const parentDimensions = useResizeObserver(parentRef.current);

    const scaleFn = useMemo(
      () =>
        throttle(() => {
          const newScale = computeScale(
            { clientHeight: parentDimensions.height, clientWidth: parentDimensions.width },
            childrenRef.current,
            autoScaleParams?.minScale
          );

          // Prevent an infinite render loop
          if (scale !== newScale) {
            setScale(newScale);
          }
        }),
      [parentDimensions, setScale, scale]
    );

    useEffect(() => {
      scaleFn();
    }, [scaleFn]);

    return (
      <div ref={parentRef} css={autoScaleWrapperStyle}>
        <div
          ref={childrenRef}
          style={{
            transform: `scale(${scale || 0})`,
          }}
        >
          <WrappedComponent {...props} />
        </div>
      </div>
    );
  };
}
