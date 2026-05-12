/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MutableRefObject } from 'react';
import { useCallback, useEffect } from 'react';
import type { ElementRegistry } from '../components/edit/element_registry';

/**
 * Keeps clone positions in sync with their original elements during scroll.
 * Active independently of edit mode so clones that remain on-screen after
 * exiting edit mode still track their originals.
 */
export const useScrollSync = (registry: MutableRefObject<ElementRegistry>) => {
  const handleScroll = useCallback(() => {
    for (const session of registry.current.values()) {
      if (!session.clone) continue;
      const rect = session.el.getBoundingClientRect();
      session.clone.style.left = `${rect.left}px`;
      session.clone.style.top = `${rect.top}px`;
    }
  }, [registry]);

  useEffect(() => {
    document.addEventListener('scroll', handleScroll, true);
    return () => document.removeEventListener('scroll', handleScroll, true);
  }, [handleScroll]);
};
