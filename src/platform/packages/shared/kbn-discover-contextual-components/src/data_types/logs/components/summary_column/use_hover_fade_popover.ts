/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export const CONTEXTUAL_BADGE_POPOVER_FADE_MS = 180;
export const CONTEXTUAL_BADGE_POPOVER_LEAVE_MS = 120;
export const CONTEXTUAL_BADGE_POPOVER_OPEN_MS = 400;

const prefersReducedMotion = (): boolean =>
  Boolean(
    process.env.JEST_WORKER_ID ||
      (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
  );

export const useHoverFadePopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const isOpenRef = useRef(false);
  const openTimerRef = useRef<number>();
  const leaveTimerRef = useRef<number>();
  const fadeTimerRef = useRef<number>();

  isOpenRef.current = isOpen;

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== undefined) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = undefined;
    }
    if (leaveTimerRef.current !== undefined) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = undefined;
    }
    if (fadeTimerRef.current !== undefined) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = undefined;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const open = useCallback(() => {
    const alreadyOpen = isOpenRef.current;
    if (leaveTimerRef.current !== undefined) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = undefined;
    }
    if (fadeTimerRef.current !== undefined) {
      window.clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = undefined;
    }
    setIsFadingOut(false);

    if (alreadyOpen) {
      return;
    }

    if (openTimerRef.current !== undefined) {
      return;
    }

    const delay = process.env.JEST_WORKER_ID ? 0 : CONTEXTUAL_BADGE_POPOVER_OPEN_MS;
    if (delay === 0) {
      setIsOpen(true);
      return;
    }

    openTimerRef.current = window.setTimeout(() => {
      openTimerRef.current = undefined;
      setIsOpen(true);
    }, delay);
  }, []);

  const closeNow = useCallback(() => {
    clearTimers();
    setIsFadingOut(false);
    setIsOpen(false);
  }, [clearTimers]);

  const scheduleClose = useCallback(() => {
    clearTimers();
    leaveTimerRef.current = window.setTimeout(() => {
      if (prefersReducedMotion()) {
        setIsOpen(false);
        setIsFadingOut(false);
        return;
      }

      setIsFadingOut(true);
      fadeTimerRef.current = window.setTimeout(() => {
        setIsOpen(false);
        setIsFadingOut(false);
      }, CONTEXTUAL_BADGE_POPOVER_FADE_MS);
    }, CONTEXTUAL_BADGE_POPOVER_LEAVE_MS);
  }, [clearTimers]);

  return {
    isOpen,
    isFadingOut,
    open,
    scheduleClose,
    closeNow,
    fadeMs: prefersReducedMotion() ? 0 : CONTEXTUAL_BADGE_POPOVER_FADE_MS,
  };
};
