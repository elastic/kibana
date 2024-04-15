/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef } from 'react';
import { WithMeasureTimeProps, Phase } from './types';

let phase: Phase;

const marks = {
  startMount: 'start::mount',
  endMount: `end::mount`,
  startOnUpdate: `start::Update`,
  endOnUpdate: `end::Update`,
};

/**
 * A Higher-Order Component (HOC) that measures the time taken for the `onMeasureComplete` event of the wrapped component.
 *
 * How it works:
 * 1. At the beginning of the `onMeasureComplete` event, a performance mark is set using the `startMark`.
 * 2. The time it takes for the `onMeasureComplete` event to complete is measured.
 * 3. At the end of the `onMeasureComplete` event, another performance mark is set using the `endMark`.
 * 4. The time between the `startMark` and `endMark` is calculated to determine the time taken for the `onMeasureComplete` event.
 * 5.
 *
 * @param {React.ComponentType<P>} BaseComponent - The component to be wrapped and measured.
 * @returns {React.FunctionComponent} - A new component that includes the render time measurement functionality.
 */
export function withMeasureTime<P>(BaseComponent: React.ComponentType<P & WithMeasureTimeProps>) {
  performance.mark(marks.startMount);

  return function WithMeasureTime(props: P & WithMeasureTimeProps) {
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
