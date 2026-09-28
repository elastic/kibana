/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createSpringTiming, supportsLinearEasing, type Timing } from '../floating_toolbar/spring';

type Direction = 'open' | 'close';

/** Fallback timing for browsers without `linear()` easing support */
const OPEN_DURATION = 260;
const CLOSE_DURATION = 200;
const EASE_OUT = 'cubic-bezier(0.2, 0, 0, 1)';
/** The first-ever expand plays the expressive compress / overshoot version */
const FIRST_OPEN_DURATION = 400;
const FIRST_EXPAND_STORAGE_KEY = 'dashboard:selectedPanelsToolbar:hasExpanded';

/** Opening settles with ~1% overshoot (looks done at ~170ms); closing has no bounce and looks done ~15% sooner */
const OPEN_SPRING = { stiffness: 380, damping: 30 };
const CLOSE_SPRING = { stiffness: 1200, damping: 68 };
/** How far the options travel with the growing edge (1 = glued to it) */
const RIDE = 0.5;
const OPTION_STAGGER = 20;

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const getTimings = (): { open: Timing; close: Timing } =>
  supportsLinearEasing()
    ? { open: createSpringTiming(OPEN_SPRING), close: createSpringTiming(CLOSE_SPRING) }
    : {
        open: { duration: OPEN_DURATION, easing: EASE_OUT },
        close: { duration: CLOSE_DURATION, easing: EASE_OUT },
      };

const hasExpandedBefore = () => {
  try {
    return window.localStorage.getItem(FIRST_EXPAND_STORAGE_KEY) === 'true';
  } catch {
    return true;
  }
};

const rememberExpanded = () => {
  try {
    window.localStorage.setItem(FIRST_EXPAND_STORAGE_KEY, 'true');
  } catch {
    // storage unavailable, the expressive version may play again
  }
};

/** Top inset of an `inset(...)` clip-path, i.e. how much of the frame is currently hidden */
const getClipTop = (element: HTMLElement) => {
  const match = /inset\(\s*(-?[\d.]+)px/.exec(getComputedStyle(element).clipPath ?? '');
  return match ? Number(match[1]) : 0;
};

const getVisualState = (element: Element) => {
  const style = getComputedStyle(element);
  return {
    opacity: style.opacity === '' ? 1 : Number(style.opacity),
    filter: style.filter && style.filter !== 'none' ? style.filter : 'blur(0px)',
    transform: style.transform && style.transform !== 'none' ? style.transform : undefined,
  };
};

/**
 * Expands the toolbar upward into a larger panel while keeping its bottom edge anchored.
 *
 * - The frame (white surface + content) is laid out at its natural size and revealed with a
 *   `clip-path` growing from the bottom edge, driven by a spring. Only the height animates.
 * - The extra options ride up with the growing edge (instead of being uncovered in place) and
 *   fade in one after another.
 * - The shadow is a `drop-shadow` on an ancestor, which follows the clipped shape.
 *
 * `frameRef` is the clipped wrapper, `moreRef` the extra options. The options stay mounted while
 * closing so they can fade out, but are made inert. Opening and closing can be interrupted: each
 * one starts from the current visual state.
 */
export const useToolbarExpandAnimation = () => {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLDivElement | null>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isMoreMounted, setIsMoreMounted] = useState(false);

  const pendingRef = useRef<{
    direction: Direction;
    /** visible height of the frame at the moment of the toggle */
    fromHeight: number;
    moreTransform?: string;
    options: Array<ReturnType<typeof getVisualState>>;
  } | null>(null);
  const animationsRef = useRef<Animation[]>([]);

  const cancelAnimations = useCallback(() => {
    for (const animation of animationsRef.current) {
      animation.onfinish = null;
      animation.cancel();
    }
    animationsRef.current = [];
  }, []);

  const toggle = useCallback(() => {
    const frame = frameRef.current;
    const more = moreRef.current;
    const direction: Direction = isExpanded ? 'close' : 'open';

    // Read animated values before cancellation restores the underlying styles.
    pendingRef.current = frame
      ? {
          direction,
          fromHeight: frame.getBoundingClientRect().height - getClipTop(frame),
          moreTransform: more ? getVisualState(more).transform : undefined,
          options: more ? Array.from(more.children).map(getVisualState) : [],
        }
      : null;
    cancelAnimations();

    setIsExpanded(!isExpanded);
    if (direction === 'open') setIsMoreMounted(true);
  }, [cancelAnimations, isExpanded]);

  useLayoutEffect(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    const frame = frameRef.current;
    const more = moreRef.current;
    if (!pending || !frame || !more) return;

    const isOpening = pending.direction === 'open';
    // Options remain mounted for their exit, but must no longer accept focus or clicks.
    more.inert = !isOpening;

    if (typeof frame.animate !== 'function' || prefersReducedMotion()) {
      if (!isOpening) setIsMoreMounted(false);
      return;
    }

    const fullHeight = frame.getBoundingClientRect().height;
    const toHeight = isOpening ? fullHeight : fullHeight - more.offsetHeight;
    const radius = getComputedStyle(frame).borderTopLeftRadius || '0px';
    const clip = (visibleHeight: number) =>
      `inset(${Math.max(0, fullHeight - visibleHeight)}px 0px 0px 0px round ${radius})`;
    const lerp = (progress: number) =>
      pending.fromHeight + (toHeight - pending.fromHeight) * progress;
    // the options sit this far below their resting place when the edge is at `visibleHeight`
    const ride = (visibleHeight: number) =>
      `translateY(${(RIDE * Math.max(0, fullHeight - visibleHeight)).toFixed(2)}px)`;

    const isFirstExpand =
      isOpening && pending.options.every((option) => option.opacity === 0) && !hasExpandedBefore();
    if (isOpening) rememberExpanded();

    const timings = getTimings();
    const timing: Timing = isFirstExpand
      ? { duration: FIRST_OPEN_DURATION, easing: 'linear' }
      : isOpening
      ? timings.open
      : timings.close;

    const frameKeyframes: Keyframe[] = isFirstExpand
      ? // compress, expand quickly, overshoot slightly, then settle
        [
          { offset: 0, clipPath: clip(lerp(0)), transform: 'none' },
          {
            offset: 0.14,
            clipPath: clip(pending.fromHeight * 0.64),
            transform: 'none',
          },
          { offset: 0.29, clipPath: clip(pending.fromHeight * 1.2), transform: 'none' },
          { offset: 0.375, clipPath: clip(lerp(0.25)), transform: 'none' },
          { offset: 0.5, clipPath: clip(lerp(0.855)), transform: 'none' },
          { offset: 0.65, clipPath: clip(lerp(1)), transform: 'scale(1.03, 1.04)' },
          { offset: 0.825, clipPath: clip(lerp(1)), transform: 'none' },
          { offset: 1, clipPath: clip(lerp(1)), transform: 'none' },
        ].map((keyframe) => ({ ...keyframe, easing: 'ease-in-out' }))
      : [{ clipPath: clip(lerp(0)) }, { clipPath: clip(lerp(1)) }];

    const animations: Animation[] = [];
    const frameAnimation = frame.animate(frameKeyframes, {
      ...timing,
      // hold the compact clip until the extra options are unmounted
      fill: isOpening ? 'none' : 'forwards',
    });
    animations.push(frameAnimation);

    // the options ride with the edge, in lockstep with the frame
    animations.push(
      more.animate(
        [
          { transform: pending.moreTransform ?? ride(pending.fromHeight) },
          { transform: isOpening ? 'none' : ride(toHeight) },
        ],
        { ...timing, fill: isOpening ? 'backwards' : 'forwards' }
      )
    );

    // each option materializes (opacity + blur that clears), one after another, and leaves
    // quieter: together, faster and sharp
    Array.from(more.children).forEach((option, index) => {
      const from = pending.options[index] ?? { opacity: 0, filter: 'blur(4px)' };
      const isFresh = isOpening && from.opacity === 0;
      animations.push(
        option.animate(
          [
            {
              opacity: from.opacity,
              filter: isFresh ? 'blur(4px)' : isOpening ? from.filter : 'blur(0px)',
            },
            { opacity: isOpening ? 1 : 0, filter: 'blur(0px)' },
          ],
          {
            duration: isOpening ? 160 : 120,
            delay: isFresh ? index * OPTION_STAGGER + (isFirstExpand ? 100 : 0) : 0,
            easing: EASE_OUT,
            fill: isOpening ? 'backwards' : 'both',
          }
        )
      );
    });

    animationsRef.current = animations;
    if (!isOpening) {
      frameAnimation.onfinish = () => setIsMoreMounted(false);
    }
  }, [isExpanded]);

  // once the extra options are gone, the frame can follow the content size again (declared before
  // the content swap effect, so a swap that also collapses keeps its own animation)
  useLayoutEffect(() => {
    if (!isMoreMounted) cancelAnimations();
  }, [cancelAnimations, isMoreMounted]);

  // Swapping the frame's content (e.g. the share colors picker) changes its height in one render.
  // Animate the height from the previous visible size so it grows / shrinks instead of jumping.
  // This is a rare, one-off change, so animating height here is an acceptable layout cost; the
  // frame is bottom-aligned with overflow hidden, so the top edge moves and the bottom stays put.
  const swapFromHeightRef = useRef<number | null>(null);
  const [swapCount, setSwapCount] = useState(0);

  const animateContentSwap = useCallback(
    (update: () => void) => {
      const frame = frameRef.current;
      swapFromHeightRef.current = frame
        ? frame.getBoundingClientRect().height - getClipTop(frame)
        : null;
      cancelAnimations();
      update();
      setSwapCount((count) => count + 1);
    },
    [cancelAnimations]
  );

  /** Leaves the expanded state without playing the close animation (e.g. inside a content swap) */
  const collapseInstantly = useCallback(() => {
    setIsExpanded(false);
    setIsMoreMounted(false);
  }, []);

  useLayoutEffect(() => {
    const fromHeight = swapFromHeightRef.current;
    swapFromHeightRef.current = null;
    const frame = frameRef.current;
    if (fromHeight === null || !frame) return;
    if (typeof frame.animate !== 'function' || prefersReducedMotion()) return;

    const toHeight = frame.getBoundingClientRect().height;
    const animations: Animation[] = [];
    if (Math.abs(toHeight - fromHeight) >= 1) {
      animations.push(
        frame.animate(
          [
            { height: `${fromHeight}px`, overflow: 'hidden' },
            { height: `${toHeight}px`, overflow: 'hidden' },
          ],
          getTimings().open
        )
      );
    }
    // the new content fades in once the frame starts moving
    const content = frame.lastElementChild;
    if (content) {
      animations.push(
        content.animate(
          [
            { opacity: 0, filter: 'blur(2px)' },
            { opacity: 1, filter: 'blur(0px)' },
          ],
          {
            duration: 140,
            delay: 40,
            easing: EASE_OUT,
            fill: 'backwards',
          }
        )
      );
    }
    animationsRef.current = animations;
  }, [swapCount]);

  useEffect(() => cancelAnimations, [cancelAnimations]);

  return {
    isExpanded,
    isMoreMounted,
    toggle,
    animateContentSwap,
    collapseInstantly,
    frameRef,
    moreRef,
  };
};
