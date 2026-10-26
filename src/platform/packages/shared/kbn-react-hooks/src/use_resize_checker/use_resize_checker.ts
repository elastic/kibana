/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef, useCallback } from 'react';
import type { monaco } from '@kbn/monaco';

/**
 * Custom resize detection hook that doesn't depend on external plugins
 * Uses native ResizeObserver API for efficient resize detection
 */
export const useResizeChecker = () => {
  const resizeObserver = useRef<ResizeObserver | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setupResizeChecker = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, options: { flyoutMode?: boolean } = {}) => {
      if (resizeObserver.current) {
        resizeObserver.current.disconnect();
      }

      let targetElement = containerRef.current;
      if (!targetElement) return;

      if (options.flyoutMode) {
        const flyoutElement = targetElement.closest('.euiFlyout') as HTMLDivElement;
        if (flyoutElement) {
          targetElement = flyoutElement;
        }
      }

      resizeObserver.current = new ResizeObserver(() => {
        if (options.flyoutMode && containerRef.current) {
          const flyoutRect = targetElement.getBoundingClientRect();
          const availableWidth = flyoutRect.width - 120;
          containerRef.current.style.width = `${availableWidth}px`;
          containerRef.current.style.maxWidth = `${availableWidth}px`;
          const containerRect = containerRef.current.getBoundingClientRect();
          editor.layout({ width: availableWidth, height: containerRect.height });
        } else {
          editor.layout();
        }
      });

      resizeObserver.current.observe(targetElement);
    },
    []
  );

  const destroyResizeChecker = useCallback(() => {
    if (resizeObserver.current) {
      resizeObserver.current.disconnect();
      resizeObserver.current = null;
    }
  }, []);

  return { containerRef, setupResizeChecker, destroyResizeChecker };
};
