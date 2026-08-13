/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';

export const VisibilityTracker = ({
  setVisibility,
}: {
  setVisibility: (isVisible: boolean) => void;
}) => {
  const [intersection, setIntersection] = useState<IntersectionObserverEntry>();

  const intersectionObserverRef = useRef(
    window.IntersectionObserver
      ? new window.IntersectionObserver(([value]) => {
          setIntersection(value);
        })
      : undefined
  );

  // Mark panel as visible when IntersectionObserver is not supported
  useEffect(() => {
    if (!intersectionObserverRef.current) {
      setVisibility(true);
    }
  }, [setVisibility]);

  useEffect(() => {
    setVisibility(Boolean(intersection?.isIntersecting));
  }, [intersection, setVisibility]);

  const refCallback = useCallback((node: HTMLDivElement | null) => {
    const { current: intersectionObserver } = intersectionObserverRef;
    if (!intersectionObserver) {
      return;
    }
    intersectionObserver.disconnect();
    if (node) intersectionObserver.observe(node);
  }, []);

  return <div ref={refCallback} css={visibilityTrackerStyles} />;
};

const visibilityTrackerStyles = css({
  pointerEvents: 'none',
  position: 'absolute',
  height: '100%',
  width: '100%',
});
