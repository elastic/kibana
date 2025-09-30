/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RefObject } from 'react';
import { useState, useEffect } from 'react';

/**
 * Hook for checking if the element is ready.
 *
 * Delays a condition (e.g. `isOpen`) from becoming `true` until a referenced DOM element exists.
 * This is useful when components like popovers or modals use animations or delayed mounting,
 * causing their `ref.current` to be `null` even after `isOpen` becomes `true`.
 *
 * @param condition - The condition to check.
 * @param ref - The reference to the DOM element.
 * @returns The ready state of the element.
 */
export const useIsElementReady = (condition: boolean, ref: RefObject<HTMLElement>) => {
  const [isElementReady, setIsElementReady] = useState(false);

  useEffect(() => {
    let frame: number;

    if (condition) {
      const waitForRef = () => {
        if (ref.current) {
          setIsElementReady(true);
        } else {
          frame = requestAnimationFrame(waitForRef);
        }
      };

      waitForRef();
    } else {
      setIsElementReady(false);
    }

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [condition, ref]);

  return isElementReady;
};
