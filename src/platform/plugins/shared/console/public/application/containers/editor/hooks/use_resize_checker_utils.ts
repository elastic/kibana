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
import { ResizeChecker } from '@kbn/kibana-utils-plugin/public';

/**
 * Hook that returns functions for setting up and destroying a {@link ResizeChecker}
 * for a Monaco editor.
 */
export const useResizeCheckerUtils = () => {
  const resizeChecker = useRef<ResizeChecker | null>(null);

  const setupResizeChecker = (
    divElement: HTMLDivElement,
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    if (resizeChecker.current) {
      resizeChecker.current.destroy();
    }

    resizeChecker.current = new ResizeChecker(divElement);
    resizeChecker.current.on('resize', () => {
      editor.layout();
    });
  };

  const destroyResizeChecker = () => {
    if (resizeChecker.current) {
      resizeChecker.current.destroy();
    }
  };

  return { setupResizeChecker, destroyResizeChecker };
};
