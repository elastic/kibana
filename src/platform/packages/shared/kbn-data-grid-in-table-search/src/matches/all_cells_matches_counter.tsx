/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { createPortal, unmountComponentAtNode } from 'react-dom';
import { AllCellsRenderer } from './all_cells_renderer';
import { AllCellsProps } from '../types';

export function AllCellsMatchesCounter(props: AllCellsProps) {
  const containerRef = useRef<DocumentFragment | null>(document.createDocumentFragment());

  useEffect(() => {
    return () => {
      if (containerRef.current) {
        unmountComponentAtNode(containerRef.current);
        containerRef.current = null;
      }
    };
  }, []);

  if (!containerRef.current) {
    return null;
  }

  // We use createPortal to render the AllCellsRenderer in a separate invisible container.
  // All parent contexts will be applied too (like KibanaRenderContextProvider, UnifiedDataTableContext, etc).
  return createPortal(<AllCellsRenderer {...props} />, containerRef.current);
}
