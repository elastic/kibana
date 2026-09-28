/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';

/** Re-selecting within this window after the toolbar left skips its entrance */
const QUICK_RESELECT_WINDOW = 1000;

const MODIFIER_KEYS = new Set(['Shift', 'Meta', 'Control', 'Alt']);

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Decides when the selected panels toolbar is shown and how the hint bar takes its place.
 *
 * - The toolbar leaves instantly when the selection is cleared (like Linear's bulk actions bar):
 *   the user is done with it, so nothing makes them wait.
 * - The hint bar then fades in after a pointer interaction, and appears instantly after a keyboard
 *   action (e.g. Escape): keyboard actions never wait on motion.
 * - Re-selecting right after the toolbar left skips its entrance.
 */
export const useSelectedPanelsToolbarPresence = (selectedPanelIds: Set<string>) => {
  const showToolbar = selectedPanelIds.size > 0;
  const [skipEntrance, setSkipEntrance] = useState(false);
  const [animateHintBarIn, setAnimateHintBarIn] = useState(true);

  const lastInputRef = useRef<'keyboard' | 'pointer'>('pointer');
  const hiddenAtRef = useRef(0);
  const wasShownRef = useRef(showToolbar);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // holding a modifier for Shift+click is still a pointer interaction
      if (!MODIFIER_KEYS.has(e.key)) lastInputRef.current = 'keyboard';
    };
    const onPointerDown = () => (lastInputRef.current = 'pointer');
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, []);

  useEffect(() => {
    if (showToolbar === wasShownRef.current) return;
    wasShownRef.current = showToolbar;
    if (showToolbar) {
      setSkipEntrance(Date.now() - hiddenAtRef.current < QUICK_RESELECT_WINDOW);
    } else {
      hiddenAtRef.current = Date.now();
      setAnimateHintBarIn(lastInputRef.current === 'pointer' && !prefersReducedMotion());
    }
  }, [showToolbar]);

  return { showToolbar, skipEntrance, animateHintBarIn };
};
