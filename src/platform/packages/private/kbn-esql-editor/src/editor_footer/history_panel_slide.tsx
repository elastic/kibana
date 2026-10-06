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

const prefersReducedMotion = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Slides the recent-queries panel open and closed. */
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

  useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
      if (prefersReducedMotion()) setIsMounted(false);
      return;
    }

    setIsMounted(true);
    if (prefersReducedMotion()) {
      setIsExpanded(true);
      return;
    }

    const frame = window.requestAnimationFrame(() => setIsExpanded(true));
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen]);

  if (!isMounted) return null;

  return (
    <div
      data-test-subj="ESQLEditor-history-panel-slide"
      data-expanded={isExpanded ? 'true' : 'false'}
      inert={isExpanded ? undefined : ''}
      onTransitionEnd={(event) => {
        if (event.propertyName === 'grid-template-rows' && !isOpen) setIsMounted(false);
      }}
      css={css`
        display: grid;
        flex: 0 0 auto;
        width: 100%;
        overflow: hidden;
        grid-template-rows: ${isExpanded ? '1fr' : '0fr'};
        @media (prefers-reduced-motion: no-preference) {
          transition: grid-template-rows ${euiTheme.animation.normal}
            ${euiTheme.animation.resistance};
        }
        > div {
          min-block-size: 0;
          overflow: hidden;
        }
      `}
    >
      <div>{children}</div>
    </div>
  );
}
