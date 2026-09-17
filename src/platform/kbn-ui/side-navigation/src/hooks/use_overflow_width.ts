/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Returns how many pixels of an element's content are hidden by its box (0 when it fits).
 */
export const useOverflowWidth = <T extends HTMLElement>(): [RefObject<T>, number] => {
  const ref = useRef<T>(null);
  const [overflowWidth, setOverflowWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const measure = () => setOverflowWidth(Math.max(0, element.scrollWidth - element.clientWidth));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, overflowWidth];
};
