/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Close a popover on any pointerdown outside its trigger cluster and portaled
 * panel. React Flow's pane uses pointer events / stopPropagation that can skip
 * EuiPopover's document mouseup outside-click detector.
 */
export const useCloseOnOutsidePointerDown = (
  isOpen: boolean,
  onClose: () => void,
  containerRef: RefObject<HTMLElement | null>,
  insideTestSubjs: readonly string[]
): void => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        onClose();
        return;
      }
      if (containerRef.current?.contains(target)) return;
      if (insideTestSubjs.some((testSubj) => target.closest(`[data-test-subj="${testSubj}"]`))) {
        return;
      }
      onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isOpen, onClose, containerRef, insideTestSubjs]);
};
