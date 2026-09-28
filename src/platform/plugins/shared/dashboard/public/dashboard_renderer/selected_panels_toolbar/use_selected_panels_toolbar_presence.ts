/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';

/** Matches the toolbar's exit animation */
export const TOOLBAR_EXIT_DURATION = 150;
/** Re-selecting within this window after the toolbar left skips its entrance */
const QUICK_RESELECT_WINDOW = 1000;

type ToolbarState = 'hidden' | 'visible' | 'exiting';

const MODIFIER_KEYS = new Set(['Shift', 'Meta', 'Control', 'Alt']);

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Decides when the selected panels toolbar is rendered, so it can play an exit once the selection
 * is cleared before the hint bar takes its place.
 *
 * - Clearing the selection with the keyboard (e.g. Escape) swaps instantly: keyboard actions
 *   never wait on motion.
 * - While exiting, the toolbar keeps showing the last non-empty selection.
 */
export const useSelectedPanelsToolbarPresence = (selectedPanelIds: Set<string>) => {
  const hasSelection = selectedPanelIds.size > 0;
  const [state, setStateValue] = useState<ToolbarState>(hasSelection ? 'visible' : 'hidden');
  const stateRef = useRef(state);
  const setState = (next: ToolbarState) => {
    stateRef.current = next;
    setStateValue(next);
  };
  const [skipEntrance, setSkipEntrance] = useState(false);
  // the hint bar fades back in when it replaces the toolbar after a pointer interaction, and
  // appears instantly after a keyboard action
  const [animateHintBarIn, setAnimateHintBarIn] = useState(true);

  const lastSelectionRef = useRef(selectedPanelIds);
  if (hasSelection) lastSelectionRef.current = selectedPanelIds;

  const lastInputRef = useRef<'keyboard' | 'pointer'>('pointer');
  const hiddenAtRef = useRef(0);

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
    if (hasSelection) {
      if (stateRef.current === 'hidden') {
        setSkipEntrance(Date.now() - hiddenAtRef.current < QUICK_RESELECT_WINDOW);
      }
      setState('visible');
      return;
    }

    const isInstant = lastInputRef.current === 'keyboard' || prefersReducedMotion();
    if (isInstant) {
      hiddenAtRef.current = Date.now();
      setAnimateHintBarIn(false);
      setState('hidden');
      return;
    }

    if (stateRef.current === 'hidden') return;
    setState('exiting');
    const timeout = setTimeout(() => {
      hiddenAtRef.current = Date.now();
      setAnimateHintBarIn(true);
      setState('hidden');
    }, TOOLBAR_EXIT_DURATION);
    return () => clearTimeout(timeout);
  }, [hasSelection]);

  return {
    showToolbar: state !== 'hidden',
    isExiting: state === 'exiting',
    skipEntrance,
    animateHintBarIn,
    toolbarPanelIds: lastSelectionRef.current,
  };
};
