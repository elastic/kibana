/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type { MenuItem } from '../../types';

interface SidePanelRenderState {
  openerNode: MenuItem;
}

/**
 * Keeps the secondary side panel mounted while enter/exit animations play.
 */
export const useSidePanelVisibility = (isSidePanelOpen: boolean, openerNode?: MenuItem) => {
  const [renderState, setRenderState] = useState<SidePanelRenderState | null>(null);
  const [isPanelShown, setIsPanelShown] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const isExitingRef = useRef(false);
  const wasRenderedRef = useRef(false);

  useEffect(() => {
    if (isSidePanelOpen && openerNode) {
      isExitingRef.current = false;

      if (!wasRenderedRef.current) {
        wasRenderedRef.current = true;
        setIsAnimating(true);
        setIsPanelShown(false);
      }

      setRenderState({ openerNode });
      return;
    }

    if (wasRenderedRef.current && !isSidePanelOpen && !isExitingRef.current) {
      isExitingRef.current = true;
      setIsAnimating(true);
    }
  }, [isSidePanelOpen, openerNode]);

  useLayoutEffect(() => {
    if (!isAnimating) {
      return;
    }

    if (isSidePanelOpen) {
      setIsPanelShown(true);
      return;
    }

    if (isExitingRef.current) {
      setIsPanelShown(false);
    }
  }, [isAnimating, isSidePanelOpen]);

  const onSidePanelAnimationEnd = useCallback(() => {
    if (isExitingRef.current) {
      isExitingRef.current = false;
      wasRenderedRef.current = false;
      setRenderState(null);
      setIsPanelShown(false);
      setIsAnimating(false);
      return;
    }

    setIsAnimating(false);
    setIsPanelShown(true);
  }, []);

  const isSidePanelShown = isAnimating
    ? isPanelShown
    : Boolean(isSidePanelOpen && renderState !== null);

  return {
    isSidePanelAnimating: isAnimating,
    isSidePanelRendered: renderState !== null,
    isSidePanelShown,
    renderedOpenerNode: renderState?.openerNode,
    onSidePanelAnimationEnd,
  };
};
