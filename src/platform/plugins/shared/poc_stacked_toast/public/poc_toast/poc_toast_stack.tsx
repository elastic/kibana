/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEuiTheme } from '@elastic/eui';
import type { PocToast } from './poc_toast_types';
import { PocToastCard } from './poc_toast_card';
import {
  POC_TOAST_COLLAPSED_Y_STEP,
  pocToastClearAllLayoutTransition,
  pocToastClearAllVariants,
} from './poc_toast_motion';
import {
  getPocToastClearAllMotionClassName,
  getPocToastMotionColumnClassName,
  getPocToastMotionColumnWidthClassName,
  getPocToastStackInteractionClassName,
  pocToastAnchorStyles,
  pocToastClearAllButtonStyles,
  pocToastStackColumnStyles,
  pocToastStackStyles,
} from './poc_toast_styles';

export interface PocToastStackProps {
  toasts: PocToast[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

const COLLAPSED_VISIBLE_TOASTS = 3;

export const PocToastStack = ({ toasts, onDismiss, onClearAll }: PocToastStackProps) => {
  const euiThemeContext = useEuiTheme();
  const columnRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [expandedWidth, setExpandedWidth] = useState<number | undefined>(undefined);
  // Stays true while exit animations run after toasts are cleared from state.
  const [showAnchor, setShowAnchor] = useState(false);
  const anchorVisible = showAnchor || toasts.length > 0;

  useLayoutEffect(() => {
    if (toasts.length > 0) {
      setShowAnchor(true);
    }
  }, [toasts.length]);

  const expand = useCallback(() => {
    const column = columnRef.current;
    if (isHovered || toasts.length === 0 || !column) {
      return;
    }
    // Collapsed, the column is exactly the front toast's width; lock it so expanding can't reflow.
    setExpandedWidth(column.getBoundingClientRect().width);
    setIsHovered(true);
  }, [isHovered, toasts.length]);

  const collapse = useCallback(() => {
    setIsHovered(false);
    setExpandedWidth(undefined);
  }, []);

  const handleBlurCapture = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        collapse();
      }
    },
    [collapse]
  );

  const handleExitComplete = useCallback(() => {
    if (toasts.length === 0) {
      setShowAnchor(false);
      collapse();
    }
  }, [collapse, toasts.length]);

  const newestFirst = useMemo(() => toasts.slice().reverse(), [toasts]);
  const stackedCount = isHovered
    ? newestFirst.length
    : Math.min(newestFirst.length, COLLAPSED_VISIBLE_TOASTS);
  const collapsedPeek = stackedCount > 1 ? (stackedCount - 1) * POC_TOAST_COLLAPSED_Y_STEP : 0;
  const showClearAll = isHovered && toasts.length > 1;

  const anchorStyles = useMemo(() => pocToastAnchorStyles(euiThemeContext), [euiThemeContext]);
  const clearAllButtonStyles = useMemo(
    () => pocToastClearAllButtonStyles(euiThemeContext),
    [euiThemeContext]
  );
  const stackInteractionClassName = useMemo(
    () => getPocToastStackInteractionClassName(anchorVisible, collapsedPeek, isHovered),
    [anchorVisible, collapsedPeek, isHovered]
  );
  const motionColumnClassName = useMemo(
    () =>
      `${getPocToastMotionColumnClassName(isHovered)} ${getPocToastMotionColumnWidthClassName(
        isHovered ? expandedWidth : undefined
      )}`,
    [expandedWidth, isHovered]
  );
  const clearAllMotionClassName = useMemo(() => getPocToastClearAllMotionClassName(), []);

  if (!anchorVisible || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      css={anchorStyles}
      aria-label="POC toast notifications"
      data-test-subj="pocToastAnchor"
      data-poc-toast-count={toasts.length}
    >
      <div css={pocToastStackColumnStyles}>
        <div
          css={pocToastStackStyles}
          className={stackInteractionClassName}
          onMouseEnter={expand}
          onMouseLeave={collapse}
          onFocusCapture={expand}
          onBlurCapture={handleBlurCapture}
        >
          <div ref={columnRef} className={motionColumnClassName}>
            <AnimatePresence initial={false} mode="sync" onExitComplete={handleExitComplete}>
              {newestFirst.map((toast, index) => (
                <PocToastCard
                  key={toast.id}
                  toast={toast}
                  index={index}
                  arrayLength={stackedCount}
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
                    css={clearAllButtonStyles}
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
    </div>,
    document.body
  );
};
