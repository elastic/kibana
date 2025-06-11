/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef } from 'react';
import { monaco } from '@kbn/monaco';
import { debounce } from 'lodash';

/**
 * Hook that returns functions for setting up and destroying a ResizeObserver
 * for a Monaco editor.
 */
export const useResizeCheckerUtils = () => {
  const resizeObserver = useRef<ResizeObserver | null>(null);

  const setupResizeChecker = (
    divElement: HTMLDivElement,
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    if (resizeObserver.current) {
      resizeObserver.current.disconnect();
    }
    
    // Debounce the resize handler to prevent infinite loops
    const debouncedLayout = debounce(() => {
      try {
        editor.layout();
      } catch (error) {
        // Ignore layout errors that might occur during rapid resizing
        console.warn('Monaco editor layout error:', error);
      }
    }, 100);
    
    resizeObserver.current = new ResizeObserver(debouncedLayout);
    resizeObserver.current.observe(divElement);
  };

  const destroyResizeChecker = () => {
    if (resizeObserver.current) {
      resizeObserver.current.disconnect();
    }
  };

  return { setupResizeChecker, destroyResizeChecker };
};
