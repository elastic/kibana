/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';

/**
 * Custom hook that provides a ref and scrolls to the element when condition is true.
 *
 * @template T - HTML element type (defaults to HTMLElement)
 * @param condition - When true, scrolls the referenced element into view
 * @returns Ref to attach to the target element
 */
export const useScrollToActive = <T extends HTMLElement = HTMLElement>(condition?: boolean) => {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (condition && ref?.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [condition]);

  return ref;
};
