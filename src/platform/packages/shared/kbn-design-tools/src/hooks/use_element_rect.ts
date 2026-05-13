/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';

/**
 * Track the viewport-relative bounding rect of an element, updating
 * automatically on scroll (capture phase) and window resize.
 */
export const useElementRect = (target: HTMLElement): DOMRect => {
  const [rect, setRect] = useState(() => target.getBoundingClientRect());

  const sync = useCallback(() => {
    setRect(target.getBoundingClientRect());
  }, [target]);

  useEffect(() => {
    sync();
    document.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    return () => {
      document.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
    };
  }, [sync]);

  return rect;
};
