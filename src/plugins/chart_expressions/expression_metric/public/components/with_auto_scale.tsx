/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  ComponentType,
  CSSProperties,
} from 'react';
import { useResizeObserver } from '@elastic/eui';
import { autoScaleWrapperStyle } from './with_auto_scale.styles';

interface AutoScaleParams {
  minScale?: number;
  containerStyles: CSSProperties;
}

interface AutoScaleProps {
  autoScaleParams?: AutoScaleParams;
  renderComplete?: () => void;
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

function hasAutoscaleProps<T>(props: T): props is T & AutoScaleProps {
  if ((props as T & AutoScaleProps).autoScaleParams) {
    return true;
  }
  return false;
}

function getWrappedComponentProps<T>(props: T) {
  if (hasAutoscaleProps(props)) {
    const { autoScaleParams, renderComplete, ...rest } = props;
    return rest;
  }

  return props;
}

export function withAutoScale<T>(WrappedComponent: ComponentType<T>) {
  return (props: T & AutoScaleProps) => {
    // An initial scale of 0 means we always redraw
    // at least once, which is sub-optimal, but it
    // prevents an annoying flicker.
    const { autoScaleParams, renderComplete } = props;
    const restProps = getWrappedComponentProps(props);
    const parentRef = useRef<HTMLDivElement>(null);
    const childrenRef = useRef<HTMLDivElement>(null);
    const parentDimensions = useResizeObserver(parentRef.current);

    const [scale, setScale] = useState(0);
    const [resized, setResized] = useState(false);

    useEffect(() => {
      setTimeout(() => {
        const newScale = computeScale(
          { clientHeight: parentDimensions.height, clientWidth: parentDimensions.width },
          childrenRef.current,
          autoScaleParams?.minScale
        );

        // Prevent an infinite render loop
        if (scale !== newScale) {
          setScale(newScale);
        }
        if (parentDimensions.height && parentDimensions.width) {
          setResized(true);
        }
      }, 0);
    }, [
      parentDimensions.height,
      parentDimensions.width,
      autoScaleParams?.minScale,
      scale,
      setResized,
    ]);

    useLayoutEffect(() => {
      if (resized) {
        renderComplete?.();
      }
    }, [renderComplete, resized]);

    return (
      <div ref={parentRef} style={autoScaleParams?.containerStyles} css={autoScaleWrapperStyle}>
        <div
          ref={childrenRef}
          style={{
            transform: `scale(${scale || 0})`,
          }}
        >
          <WrappedComponent {...(restProps as T)} />
        </div>
      </div>
    );
  };
}
