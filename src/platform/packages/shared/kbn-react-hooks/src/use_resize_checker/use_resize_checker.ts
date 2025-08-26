/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef } from 'react';
import type { monaco } from '@kbn/code-editor';
import { ResizeChecker } from '@kbn/kibana-utils-plugin/public';

export const useResizeChecker = () => {
  const resizeChecker = useRef<ResizeChecker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const setupResizeChecker = (
    editor: monaco.editor.IStandaloneCodeEditor,
    options: { flyoutMode?: boolean } = {}
  ) => {
    if (resizeChecker.current) {
      resizeChecker.current.destroy();
    }

    let targetElement = containerRef.current;
    if (!targetElement) return;

    if (options.flyoutMode) {
      const flyoutElement = targetElement.closest('.euiFlyout') as HTMLDivElement;
      if (flyoutElement) {
        targetElement = flyoutElement;
      }
    }

    resizeChecker.current = new ResizeChecker(targetElement);
    resizeChecker.current.on('resize', () => {
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
  };

  const destroyResizeChecker = () => {
    if (resizeChecker.current) {
      resizeChecker.current.destroy();
    }
  };

  return { containerRef, setupResizeChecker, destroyResizeChecker };
};