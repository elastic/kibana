/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';
import { createViewportObserver } from './viewport_observer';

interface Args {
  onFirstVisible?: () => void;
}

export function useViewportObserver({ onFirstVisible }: Args = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const [viewportObserver] = useState(() => createViewportObserver());
  const subscriptionRef = useRef<undefined | Subscription>();
  const ref = useCallback(
    (element: null | HTMLElement) => {
      if (element && !subscriptionRef.current) {
        subscriptionRef.current = viewportObserver.observeElement(element).subscribe(() => {
          setIsVisible(true);
          onFirstVisible?.();
        });
      }
    },
    [viewportObserver, onFirstVisible]
  );
  useEffect(() => () => subscriptionRef.current?.unsubscribe(), []);
  return {
    isVisible,
    ref,
  };
}
