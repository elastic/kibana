/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Transition, Variants } from 'framer-motion';

/** Vertical gap between cards when the stack is expanded (hover). */
export const POC_TOAST_STACK_GAP = 8;
/** Vertical offset between collapsed stack cards (peek step). */
export const POC_TOAST_COLLAPSED_Y_STEP = 12;
/** Fallback before layout measure (offsets / peek only). */
export const POC_TOAST_DEFAULT_CARD_HEIGHT = 48;
/** Collapsed front toast width cap; expanded stack uses exactly this width. */
export const POC_TOAST_MAX_CARD_WIDTH = 400;
/** Dismiss / clear-all exit travels toward the top of the viewport. */
export const POC_TOAST_EXIT_Y = -120;

/** Tween avoids long spring layout work on pointer enter/leave (Chrome violation warnings). */
export const pocToastStackTransition: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: 'easeOut',
};

export interface PocToastVariantContext {
  isHovered: boolean;
  index: number;
  maxToasts: number;
}

export const createPocToastVariants = ({
  isHovered,
  index,
  maxToasts,
}: PocToastVariantContext): Variants => ({
  initial: {
    y: -70,
    opacity: 0,
    scale: 0.9,
    transition: pocToastStackTransition,
  },
  animate: {
    y: isHovered ? 0 : index * POC_TOAST_COLLAPSED_Y_STEP,
    scale: isHovered ? 1 : 1 - index * 0.05,
    opacity: isHovered ? 1 : index === 0 || index === 1 ? 1 : index === 2 ? 0.6 : 0,
    zIndex: maxToasts - index,
    transition: pocToastStackTransition,
  },
  exit: {
    y: POC_TOAST_EXIT_Y,
    opacity: 0,
    scale: 0.85,
    transition: {
      delay: index * 0.05,
      duration: 0.22,
      ease: 'easeIn',
    },
  },
});

export const getPocToastHeight = (
  cardHeights: Readonly<Record<string, number>>,
  toastId: string
): number => cardHeights[toastId] ?? POC_TOAST_DEFAULT_CARD_HEIGHT;

/** Cumulative translateY for each toast (newest-first order). */
export const getPocToastExpandedOffsets = (
  toasts: ReadonlyArray<{ id: string }>,
  cardHeights: Readonly<Record<string, number>>,
  gap: number
): number[] => {
  let offset = 0;
  const offsets: number[] = [];

  for (let i = 0; i < toasts.length; i++) {
    offsets.push(offset);
    if (i < toasts.length - 1) {
      offset += getPocToastHeight(cardHeights, toasts[i].id) + gap;
    }
  }

  return offsets;
};

/** Extra space below the front card so peek/expanded stacks fit in layout. */
export const getPocToastStackExtraHeightBelowFront = (
  toasts: ReadonlyArray<{ id: string }>,
  expandedOffsets: number[],
  cardHeights: Readonly<Record<string, number>>
): number => {
  if (toasts.length <= 1) {
    return 0;
  }

  const lastIndex = toasts.length - 1;
  const frontHeight = getPocToastHeight(cardHeights, toasts[0].id);
  const lastBottom =
    expandedOffsets[lastIndex] + getPocToastHeight(cardHeights, toasts[lastIndex].id);

  return Math.max(0, lastBottom - frontHeight);
};

export const getPocToastPointerEventsEnabled = (
  index: number,
  isHovered: boolean
): boolean => {
  if (isHovered) {
    return true;
  }
  return index <= 2;
};

export const pocToastClearAllVariants: Variants = {
  initial: { opacity: 0, y: -10, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.15, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

export const pocToastClearAllLayoutTransition: Transition = {
  type: 'tween',
  duration: 0.2,
  ease: 'easeOut',
};

export const getPocToastStackPeekPadding = (
  arrayLength: number,
  isHovered: boolean,
  cardHeight: number,
  gap: number
): number => {
  if (arrayLength <= 1) {
    return 0;
  }
  const step = isHovered ? cardHeight + gap : POC_TOAST_COLLAPSED_Y_STEP;
  return (arrayLength - 1) * step;
};
