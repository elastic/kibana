/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useRef } from 'react';
import { WithRenderTimeProps, Phase } from './types';

let phase: Phase;

export const withRenderTime = <P extends WithRenderTimeProps>(
  BaseComponent: React.ComponentType<P>
) => {
  const startTimeOnInitialMount = performance.now();

  return function WithRenderTime(props: P) {
    const startTimeOnRerender = performance.now();
    const renderTime = useRef<number | undefined>(undefined);

    useEffect(() => {
      if (props.onEndTracking) {
        const endTime = performance.now();

        if (!renderTime.current) {
          phase = 'mounted';
          renderTime.current = endTime - startTimeOnInitialMount;
        } else {
          phase = 'updated';
          renderTime.current = endTime - startTimeOnRerender;
        }
      }
    }, [props.onEndTracking]);

    return (
      <span
        data-ebt-render-time={renderTime.current ?? 0}
        data-ebt-target={`${props.targetId}__${phase}`}
      >
        <BaseComponent {...props} />
      </span>
    );
  };
};
