/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef } from 'react';
import useMount from 'react-use/lib/useMount';

import { WithPerformanceMetricsProps, Phase } from './types';

let phase: Phase;

/**
 * Defines a set of marks used for performance metrics.
 */
// TODO come up with better names
export const perfomanceMarks = {
  startPageChange: 'start::pageChange',
  endPageReady: 'end::pageReady',
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
  return function WithPerformanceMetrics(props: P & WithPerformanceMetricsProps) {
    const hasMounted = useRef<boolean>(false);

    const target = props.target;

    useMount(() => {
      performance.mark(perfomanceMarks.startMount);
    });

    useEffect(() => {
      if (props.onMeasureComplete && !hasMounted.current) {
        hasMounted.current = true;

        performance.mark(perfomanceMarks.endMount);
        phase = 'mounted';

        /**
         * Measure the duration from the moment the user navigates to the page until the `onMeasureComplete` event is completed.
         * */

        performance.measure(
          `${target}__actual_duration`,
          perfomanceMarks.startPageChange,
          perfomanceMarks.endMount
        );

        /**
         * Measure the time taken for the `onMeasureComplete` event to complete from the time the component is mounted.
         * */

        performance.measure(
          `${target}__${phase}`,
          perfomanceMarks.startMount,
          perfomanceMarks.endMount
        );

        return () => {
          performance.clearMeasures();
          // TODO clear marks
        };
      }

      if (props.onMeasureComplete && hasMounted.current && !props.onMarkUpdate) {
        performance.mark(perfomanceMarks.endOnUpdate);
        phase = 'updated';
        // TODO check if markes exist before measuring

        /**
         * Measure the time taken for the `onMeasureComplete` event to complete from the time the component is re-rendered.
         * */

        performance.measure(
          `${target}__${phase}`,
          perfomanceMarks.startOnUpdate,
          perfomanceMarks.endOnUpdate
        );
      }
    }, [props.onMeasureComplete]);

    useEffect(() => {
      if (props.onMarkUpdate && hasMounted.current) {
        performance.mark(perfomanceMarks.startOnUpdate);
      }
    }, [props.onMarkUpdate]);

    return <BaseComponent {...props} />;
  };
}
