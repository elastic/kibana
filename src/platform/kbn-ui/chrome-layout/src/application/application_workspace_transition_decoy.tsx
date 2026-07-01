/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TransitionEvent } from 'react';
import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import { euiShadow, useEuiTheme } from '@elastic/eui';
import { layoutLevels } from '@kbn/ui-chrome-layout-constants';
import { getHighContrastBorder } from '@kbn/ui-chrome-layout-utils';

import type { ApplicationWorkspaceRect } from './application_workspace_transition_phase';

const TRANSITION_MS = 250;

const decoyShellStyles = css`
  position: fixed;
  z-index: ${layoutLevels.applicationTopBar + 1};
  transform-origin: right center;
  transition: transform ${TRANSITION_MS}ms ease-in-out;
  pointer-events: none;
  box-sizing: border-box;
`;

export interface ApplicationWorkspaceTransitionDecoyProps {
  phase: 'closing' | 'opening';
  rect: ApplicationWorkspaceRect;
  onComplete: () => void;
}

/**
 * Lightweight fixed overlay that animates application workspace hide/show while
 * the real app column snaps instantly in the grid underneath.
 */
export const ApplicationWorkspaceTransitionDecoy = ({
  phase,
  rect,
  onComplete,
}: ApplicationWorkspaceTransitionDecoyProps) => {
  const euiThemeContext = useEuiTheme();
  const { euiTheme } = euiThemeContext;
  const completedRef = useRef(false);
  const [scaleX, setScaleX] = useState(() => (phase === 'opening' ? 0 : 1));

  const complete = useCallback(() => {
    if (completedRef.current) {
      return;
    }

    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useLayoutEffect(() => {
    completedRef.current = false;

    const rafId = requestAnimationFrame(() => {
      setScaleX(phase === 'opening' ? 1 : 0);
    });

    const timeoutId = window.setTimeout(() => {
      complete();
    }, TRANSITION_MS + 50);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [complete, phase, rect.height, rect.left, rect.top, rect.width]);

  const handleTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (event.propertyName !== 'transform') {
        return;
      }

      complete();
    },
    [complete]
  );

  const shellStyles = css`
    ${decoyShellStyles};
    background-color: ${euiTheme.colors.backgroundBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
    outline: ${getHighContrastBorder(euiThemeContext)};
    ${euiShadow(euiThemeContext, 'xs', { border: 'none' })};
  `;

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      css={shellStyles}
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        transform: `scaleX(${scaleX})`,
      }}
      data-test-subj="applicationWorkspaceTransitionDecoy"
      onTransitionEnd={handleTransitionEnd}
    />,
    document.body
  );
};
