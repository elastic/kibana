/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect } from 'react';
import { isEscapeKey } from '../lib';

/**
 * Registers a capture-phase keydown listener that calls `onEscape`
 * when the Escape key is pressed, preventing further propagation.
 */
export const useEscapeKey = (onEscape: () => void) => {
  const handler = useCallback(
    (event: KeyboardEvent) => {
      if (isEscapeKey(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        onEscape();
      }
    },
    [onEscape]
  );

  useEffect(() => {
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [handler]);
};
