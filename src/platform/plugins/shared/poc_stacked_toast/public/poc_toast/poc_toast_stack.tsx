/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEuiTheme } from '@elastic/eui';
import type { PocToast, PocToastPlacement } from './poc_toast_types';
import { PocToastCard } from './poc_toast_card';
import {
  POC_TOAST_COLLAPSED_Y_STEP,
  pocToastClearAllVariants,
  pocToastStackTransition,
} from './poc_toast_motion';
import {
  getPocToastColumnClassName,
  pocToastAnchorStyles,
  pocToastClearAllButtonStyles,
  pocToastClearAllMotionClassName,
} from './poc_toast_styles';

export interface PocToastStackProps {
  toasts: PocToast[];
  placement: PocToastPlacement;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

const COLLAPSED_VISIBLE_TOASTS = 3;
const clearAllTransition = { layout: pocToastStackTransition };

export const PocToastStack = ({ toasts, placement, onDismiss, onClearAll }: PocToastStackProps) => {
  const euiThemeContext = useEuiTheme();
  const columnRef = useRef<HTMLDivElement>(null);
  // Defined while expanded: the front toast's collapsed width, locked so expanding can't reflow.
  const [expandedWidth, setExpandedWidth] = useState<number>();
  // Stays true while exit animations run after the last toast is removed.
  const [isAnchorVisible, setIsAnchorVisible] = useState(false);
  const isExpanded = expandedWidth !== undefined;
  const hasToasts = toasts.length > 0;

  if (hasToasts && !isAnchorVisible) {
    setIsAnchorVisible(true);
  }

  const expand = useCallback(() => {
    if (!isExpanded && hasToasts && columnRef.current) {
      setExpandedWidth(columnRef.current.getBoundingClientRect().width);
    }
  }, [hasToasts, isExpanded]);

  const collapse = useCallback(() => setExpandedWidth(undefined), []);

  const handleBlurCapture = useCallback(
    ({ currentTarget, relatedTarget }: React.FocusEvent<HTMLDivElement>) => {
      if (!currentTarget.contains(relatedTarget as Node | null)) {
        collapse();
      }
    },
    [collapse]
  );

  const handleExitComplete = useCallback(() => {
    if (!hasToasts) {
      setIsAnchorVisible(false);
      collapse();
    }
  }, [collapse, hasToasts]);

  const newestFirst = useMemo(() => toasts.slice().reverse(), [toasts]);
  const anchorStyles = useMemo(
    () => pocToastAnchorStyles(euiThemeContext, placement),
    [euiThemeContext, placement]
  );
  const clearAllButtonStyles = useMemo(
    () => pocToastClearAllButtonStyles(euiThemeContext),
    [euiThemeContext]
  );
  const columnClassName = useMemo(() => getPocToastColumnClassName(expandedWidth), [expandedWidth]);

  if (!isAnchorVisible || typeof document === 'undefined') {
    return null;
  }

  const peekCount = Math.min(toasts.length, COLLAPSED_VISIBLE_TOASTS) - 1;

  return createPortal(
    <div
      css={anchorStyles}
      aria-label="POC toast notifications"
      data-test-subj="pocToastAnchor"
      data-poc-toast-count={toasts.length}
    >
      <div
        style={{
          paddingBottom: isExpanded ? 0 : Math.max(0, peekCount) * POC_TOAST_COLLAPSED_Y_STEP,
        }}
        onMouseEnter={expand}
        onMouseLeave={collapse}
        onFocusCapture={expand}
        onBlurCapture={handleBlurCapture}
      >
        <div ref={columnRef} className={columnClassName}>
          <AnimatePresence onExitComplete={handleExitComplete}>
            {newestFirst.map((toast, index) => (
              <PocToastCard
                key={toast.id}
                toast={toast}
                index={index}
                isExpanded={isExpanded}
                onDismiss={onDismiss}
              />
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {isExpanded && toasts.length > 1 ? (
              <motion.div
                key="poc-toast-clear-all"
                layout
                className={pocToastClearAllMotionClassName}
                variants={pocToastClearAllVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={clearAllTransition}
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
    </div>,
    document.body
  );
};
