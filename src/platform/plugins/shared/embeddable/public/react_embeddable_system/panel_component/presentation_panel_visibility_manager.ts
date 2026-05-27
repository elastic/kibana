/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { onVisibilityChange } from '@kbn/presentation-publishing';
import { useEffect, useRef, useState } from 'react';
import type { DefaultPresentationPanelApi } from './types';

export const usePresentationPanelVisibilityManager = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi
>(
  api: ApiType | null
) => {
  const [intersection, updateIntersection] = useState<IntersectionObserverEntry>();

  const visibilityTrackerRef = useRef<HTMLDivElement | null>(null);
  const intersectionObserverRef = useRef(
    window.IntersectionObserver
      ? new window.IntersectionObserver(
          ([value]) => {
            updateIntersection(value);
          },
          {
            root: visibilityTrackerRef.current,
          }
        )
      : undefined
  );

  useEffect(() => {
    const { current: intersectionObserver } = intersectionObserverRef;
    if (!intersectionObserver) {
      onVisibilityChange(api, true);
      return;
    }
    intersectionObserver.disconnect();
    const { current: visibilityTracker } = visibilityTrackerRef;
    if (visibilityTracker) intersectionObserver.observe(visibilityTracker);

    return () => intersectionObserver.disconnect();
  }, [visibilityTrackerRef, api]);

  useEffect(() => {
    onVisibilityChange(api, Boolean(intersection?.isIntersecting));
  }, [intersection, api]);

  return visibilityTrackerRef;
};
