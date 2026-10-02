/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { PocToastCardMetricsUpdate } from './poc_toast_stack_layout_context';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEuiTheme } from '@elastic/eui';
import type { PocToast } from './poc_toast_types';
import { PocToastCard } from './poc_toast_card';
import {
  POC_TOAST_COLLAPSED_Y_STEP,
  getPocToastHeight,
  pocToastClearAllLayoutTransition,
  pocToastClearAllVariants,
} from './poc_toast_motion';
import {
  PocToastStackLayoutContext,
  type PocToastStackLayoutContextValue,
} from './poc_toast_stack_layout_context';
import {
  getPocToastClearAllMotionClassName,
  getPocToastMotionColumnWidthClassName,
  getPocToastStackInteractionClassName,
  pocToastAnchorStyles,
  pocToastClearAllButtonStyles,
  getPocToastMotionColumnClassName,
  pocToastStackColumnStyles,
  pocToastStackStyles,
} from './poc_toast_styles';

export interface PocToastStackProps {
  toasts: PocToast[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

export const PocToastStack = ({ toasts, onDismiss, onClearAll }: PocToastStackProps) => {
  const euiThemeContext = useEuiTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [cardHeights, setCardHeightsState] = useState<Record<string, number>>({});
  const [cardIntrinsicWidths, setCardIntrinsicWidthsState] = useState<Record<string, number>>({});

  const pendingMetricsRef = useRef<Record<string, PocToastCardMetricsUpdate>>({});
  const metricsFlushRef = useRef<number | undefined>(undefined);

  const flushQueuedMetrics = useCallback(() => {
    metricsFlushRef.current = undefined;
    const pending = pendingMetricsRef.current;
    const pendingIds = Object.keys(pending);

    if (pendingIds.length === 0) {
      return;
    }

    pendingMetricsRef.current = {};

    setCardHeightsState((currentHeights) => {
      let nextHeights = currentHeights;
      let heightsChanged = false;

      for (const toastId of pendingIds) {
        const height = pending[toastId]?.height;
        if (height === undefined || currentHeights[toastId] === height) {
          continue;
        }
        if (!heightsChanged) {
          nextHeights = { ...currentHeights };
          heightsChanged = true;
        }
        nextHeights[toastId] = height;
      }

      return heightsChanged ? nextHeights : currentHeights;
    });

    setCardIntrinsicWidthsState((currentWidths) => {
      let nextWidths = currentWidths;
      let widthsChanged = false;

      for (const toastId of pendingIds) {
        const width = pending[toastId]?.width;
        if (width === undefined || currentWidths[toastId] === width) {
          continue;
        }
        if (!widthsChanged) {
          nextWidths = { ...currentWidths };
          widthsChanged = true;
        }
        nextWidths[toastId] = width;
      }

      return widthsChanged ? nextWidths : currentWidths;
    });
  }, []);

  const queueCardMetrics = useCallback(
    (toastId: string, update: PocToastCardMetricsUpdate) => {
      pendingMetricsRef.current[toastId] = {
        ...pendingMetricsRef.current[toastId],
        ...update,
      };

      if (metricsFlushRef.current === undefined) {
        metricsFlushRef.current = requestAnimationFrame(flushQueuedMetrics);
      }
    },
    [flushQueuedMetrics]
  );

  useLayoutEffect(
    () => () => {
      if (metricsFlushRef.current !== undefined) {
        cancelAnimationFrame(metricsFlushRef.current);
      }
    },
    []
  );

  useLayoutEffect(() => {
    const activeIds = new Set(toasts.map((toast) => toast.id));
    setCardHeightsState((current) => {
      let changed = false;
      const next: Record<string, number> = {};

      for (const [id, height] of Object.entries(current)) {
        if (activeIds.has(id)) {
          next[id] = height;
        } else {
          changed = true;
        }
      }

      return changed ? next : current;
    });
    setCardIntrinsicWidthsState((current) => {
      let changed = false;
      const next: Record<string, number> = {};

      for (const [id, width] of Object.entries(current)) {
        if (activeIds.has(id)) {
          next[id] = width;
        } else {
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [toasts]);
  // Stays true while exit animations run after toasts are cleared from state.
  const [showAnchor, setShowAnchor] = useState(false);
  const anchorVisible = showAnchor || toasts.length > 0;

  useLayoutEffect(() => {
    if (toasts.length > 0) {
      setShowAnchor(true);
    }
  }, [toasts.length]);

  const newestFirst = useMemo(() => toasts.slice().reverse(), [toasts]);
  const arrayLength = newestFirst.length;
  const stackedCount = isHovered ? arrayLength : Math.min(arrayLength, 3);
  const frontToastId = newestFirst[0]?.id ?? '';
  const frontCardHeight = getPocToastHeight(cardHeights, frontToastId);
  const collapsedStackWidth = cardIntrinsicWidths[frontToastId] || undefined;
  const expandedStackWidth = isHovered ? collapsedStackWidth : undefined;
  const stackWidth = collapsedStackWidth;
  const collapsedPeek =
    stackedCount > 1 ? (stackedCount - 1) * POC_TOAST_COLLAPSED_Y_STEP : 0;
  const stackPaddingBottom = isHovered ? 0 : collapsedPeek;
  const hasStackContent = anchorVisible;
  const showClearAll = isHovered && toasts.length > 1;

  const stackInteractionClassName = useMemo(
    () =>
      getPocToastStackInteractionClassName(
        hasStackContent,
        toasts.length > 0 ? stackPaddingBottom : 0,
        isHovered
      ),
    [hasStackContent, isHovered, stackPaddingBottom, toasts.length]
  );

  const motionColumnClassName = useMemo(
    () => getPocToastMotionColumnClassName(isHovered),
    [isHovered]
  );

  const clearAllMotionClassName = useMemo(() => getPocToastClearAllMotionClassName(), []);

  const handleExitComplete = () => {
    if (toasts.length === 0) {
      setShowAnchor(false);
      setIsHovered(false);
    }
  };

  const motionColumnWidthClassName = useMemo(
    () => getPocToastMotionColumnWidthClassName(stackWidth),
    [stackWidth]
  );

  const stackLayoutValue = useMemo<PocToastStackLayoutContextValue>(
    () => ({
      isStackHovered: isHovered,
      frontCardHeight,
      collapsedStackWidth,
      expandedStackWidth,
      cardHeights,
      queueCardMetrics,
    }),
    [
      cardHeights,
      collapsedStackWidth,
      expandedStackWidth,
      frontCardHeight,
      isHovered,
      queueCardMetrics,
    ]
  );

  if (!anchorVisible) {
    return null;
  }

  const stack = (
    <PocToastStackLayoutContext.Provider value={stackLayoutValue}>
    <div
      css={pocToastAnchorStyles(euiThemeContext)}
      aria-label="POC toast notifications"
      data-test-subj="pocToastAnchor"
      data-poc-toast-count={toasts.length}
    >
      <div css={pocToastStackColumnStyles}>
        <div
          css={pocToastStackStyles}
          className={stackInteractionClassName}
          onMouseEnter={() => toasts.length > 0 && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onFocusCapture={() => toasts.length > 0 && setIsHovered(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsHovered(false);
            }
          }}
        >
          <div
            className={`${motionColumnClassName} ${motionColumnWidthClassName}`}
          >
            <AnimatePresence initial={false} mode="sync" onExitComplete={handleExitComplete}>
              {newestFirst.map((toast, index) => (
                <PocToastCard
                  key={toast.id}
                  toast={toast}
                  index={index}
                  arrayLength={stackedCount > 0 ? stackedCount : newestFirst.length}
                  isHovered={isHovered}
                  onDismiss={onDismiss}
                />
              ))}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {showClearAll ? (
                <motion.div
                  key="poc-toast-clear-all"
                  layout
                  className={clearAllMotionClassName}
                  variants={pocToastClearAllVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ layout: pocToastClearAllLayoutTransition }}
                >
                  <button
                    type="button"
                    css={pocToastClearAllButtonStyles(euiThemeContext)}
                    onClick={onClearAll}
                    data-test-subj="pocToastClearAllButton"
                  >
                    Clear all
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
    </PocToastStackLayoutContext.Provider>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(stack, document.body);
};
