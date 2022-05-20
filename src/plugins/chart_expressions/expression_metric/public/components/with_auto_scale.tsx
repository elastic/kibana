/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useRef, useEffect, useState, ComponentType, useMemo, CSSProperties } from 'react';
import { throttle } from 'lodash';
import { useResizeObserver } from '@elastic/eui';
import { autoScaleWrapperStyle } from './with_auto_scale.styles';

interface AutoScaleParams {
  minScale?: number;
  containerStyles: CSSProperties;
}

interface AutoScaleProps {
  autoScaleParams?: AutoScaleParams;
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
    const { autoScaleParams, ...rest } = props;
    return rest;
  }

  return props;
}

export function withAutoScale<T>(WrappedComponent: ComponentType<T>) {
  return (props: T & AutoScaleProps) => {

    const restProps = getWrappedComponentProps(props);
    const parentRef = useRef<HTMLDivElement>(null);
    const childrenRef = useRef<HTMLDivElement>(null);

    return (
      <div ref={parentRef} >
        <div
          ref={childrenRef}
        >
          <WrappedComponent {...(restProps as T)} />
        </div>
      </div>
    );
  };
}
