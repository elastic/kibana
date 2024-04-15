/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef } from 'react';
import { WithPerformanceMetricsProps, Phase } from './types';

let phase: Phase;

/**
 * Defines a set of marks used for performance metrics.
 */
const marks = {
  startMount: 'start::mount',
  endMount: `end::mount`,
  startOnUpdate: `start::Update`,
  endOnUpdate: `end::Update`,
};

/**
 * A Higher-Order Component (HOC) that marks and measures perfomance metrics the time taken for the `onMeasureComplete` event of the wrapped component
 * on mount and render.
 *
 * How it works:
 * 1. On first mount, a performance mark is set using the `startMount`.
 * 2. At the end of the `onMeasureComplete` event, another performance mark is set using the `endMount`.
 * 3. The time between the `startMount` and `endMount` is calculated to determine the time taken for the `onMeasureComplete` event.
 *
 * @param {React.ComponentType<P>} BaseComponent - The component to be wrapped and measured.
 * @returns {React.FunctionComponent} - A new component that includes the render time measurement functionality.
 */
export function withPerformanceMetrics<P>(
  BaseComponent: React.ComponentType<P & WithPerformanceMetricsProps>
) {
  performance.mark(marks.startMount);

  return function WithPerformanceMetrics(props: P & WithPerformanceMetricsProps) {
    const hasMounted = useRef<boolean>(false);
    const measureName = props.measureName;

    // Set a marker on each render
    performance.mark(marks.startOnUpdate);

    useEffect(() => {
      if (props.onMeasureComplete) {
        if (hasMounted.current) {
          performance.mark(marks.endOnUpdate);
          phase = 'updated';
          performance.measure(`${measureName}__${phase}`, marks.startOnUpdate, marks.endOnUpdate);
        } else {
          hasMounted.current = true;

          performance.mark(marks.endMount);
          phase = 'mounted';
          performance.measure(`${measureName}__${phase}`, marks.startMount, marks.endMount);
        }

        return () => {
          performance.clearMeasures();
        };
      }
    }, [props.onMeasureComplete]);

    return <BaseComponent {...props} />;
  };
}
