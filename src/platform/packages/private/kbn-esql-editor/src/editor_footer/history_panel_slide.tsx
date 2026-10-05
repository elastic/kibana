/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

const SLIDE_FALLBACK_MS = 250;
const SLIDE_END_BUFFER_MS = 50;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function cssDurationToMs(duration: string | undefined): number {
  if (!duration) {
    return SLIDE_FALLBACK_MS;
  }

  const value = Number.parseFloat(duration);
  if (Number.isNaN(value)) {
    return SLIDE_FALLBACK_MS;
  }

  return duration.trim().endsWith('ms') ? value : value * 1000;
}

/** Slides the recent-queries panel open and closed under the editor footer. */
export function HistoryPanelSlide({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: React.ReactNode;
}): JSX.Element | null {
  const { euiTheme } = useEuiTheme();
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isExpanded, setIsExpanded] = useState(isOpen);
  const slideMs = cssDurationToMs(euiTheme.animation.normal);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      if (prefersReducedMotion()) {
        setIsExpanded(true);
      }
      return;
    }

    setIsExpanded(false);
    if (prefersReducedMotion()) {
      setIsMounted(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isMounted || !isOpen || isExpanded || prefersReducedMotion()) {
      return;
    }

    // Wait until the collapsed frame has painted so the expand can transition.
    const frame = window.requestAnimationFrame(() => {
      setIsExpanded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isExpanded, isMounted, isOpen]);

  useEffect(() => {
    if (isOpen || !isMounted || prefersReducedMotion()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsMounted(false);
    }, slideMs + SLIDE_END_BUFFER_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isMounted, isOpen, slideMs]);

  if (!isMounted) {
    return null;
  }

  const duration = euiTheme.animation.normal ?? `${SLIDE_FALLBACK_MS}ms`;
  const easing = euiTheme.animation.resistance ?? 'ease';

  return (
    <div
      data-test-subj="ESQLEditor-history-panel-slide"
      data-expanded={isExpanded ? 'true' : 'false'}
      aria-hidden={isExpanded ? undefined : true}
      onTransitionEnd={(event) => {
        if (
          event.target !== event.currentTarget ||
          event.propertyName !== 'grid-template-rows' ||
          isOpen
        ) {
          return;
        }
        setIsMounted(false);
      }}
      {...(!isExpanded ? { inert: '' } : {})}
      css={css`
        display: grid;
        flex: 0 0 auto;
        width: 100%;
        min-block-size: 0;
        overflow: hidden;
        grid-template-rows: ${isExpanded ? '1fr' : '0fr'};
        opacity: ${isExpanded ? 1 : 0};
        @media (prefers-reduced-motion: no-preference) {
          transition: grid-template-rows ${duration} ${easing}, opacity ${duration} ${easing};
        }
      `}
    >
      <div
        css={css`
          min-block-size: 0;
          overflow: hidden;
          transform: translateY(${isExpanded ? '0' : `-${euiTheme.size.base}`});
          @media (prefers-reduced-motion: no-preference) {
            transition: transform ${duration} ${easing};
          }
        `}
      >
        {children}
      </div>
    </div>
  );
}
