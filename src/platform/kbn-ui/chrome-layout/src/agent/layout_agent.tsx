/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties, ReactNode, TransitionEvent } from 'react';
import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { css } from '@emotion/react';
import { euiIncludeSelectorInFocusTrap } from '@kbn/ui-chrome-layout-constants';

import { useLayoutConfig } from '../layout_config_context';
import { AGENT_PANEL_WIDTH_CSS_VAR, contentHiddenStyles, styles } from './layout_agent.styles';

const hiddenStyles = css`
  display: none;
`;

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export interface LayoutAgentProps {
  children: ReactNode;
}

/**
 * The agent workspace slot wrapper — a peer app workspace column for Agent Builder.
 */
export const LayoutAgent = ({ children }: LayoutAgentProps) => {
  const {
    chromeStyle,
    agentWorkspaceOpen = true,
    applicationWorkspaceOpen = true,
    applicationWorkspaceTransitionPhase = 'none',
    agentWidth = 0,
  } = useLayoutConfig();

  const appTransitioning = applicationWorkspaceTransitionPhase !== 'none';

  const useWidthTransition =
    chromeStyle === 'project' &&
    applicationWorkspaceOpen &&
    applicationWorkspaceTransitionPhase === 'none' &&
    !prefersReducedMotion();
  const useInstantHide = !useWidthTransition && !appTransitioning;
  const isCollapsed = !agentWorkspaceOpen;

  const [isContentHidden, setIsContentHidden] = useState(isCollapsed && useInstantHide);

  useLayoutEffect(() => {
    if (useWidthTransition && agentWorkspaceOpen) {
      setIsContentHidden(false);
    }

    if (useInstantHide && !agentWorkspaceOpen) {
      setIsContentHidden(true);
    }
  }, [agentWorkspaceOpen, useInstantHide, useWidthTransition]);

  const handleTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (!useWidthTransition || event.propertyName !== 'width') {
        return;
      }

      if (!agentWorkspaceOpen) {
        setIsContentHidden(true);
      }
    },
    [agentWorkspaceOpen, useWidthTransition]
  );

  const panelStyle = useMemo((): CSSProperties | undefined => {
    if (!useWidthTransition || agentWidth <= 0) {
      return undefined;
    }

    return {
      [AGENT_PANEL_WIDTH_CSS_VAR]: `${agentWidth}px`,
    } as CSSProperties;
  }, [agentWidth, useWidthTransition]);

  return (
    <div
      css={[
        styles.root(chromeStyle, useWidthTransition),
        useInstantHide && isCollapsed ? hiddenStyles : undefined,
      ]}
      className={classNames('kbnChromeLayoutAgent', {
        isCollapsed: useWidthTransition && isCollapsed,
      })}
      style={panelStyle}
      data-test-subj="kbnChromeLayoutAgent"
      data-agent-workspace-open={agentWorkspaceOpen}
      onTransitionEnd={handleTransitionEnd}
      {...euiIncludeSelectorInFocusTrap.prop}
    >
      <div css={[styles.content, isContentHidden ? contentHiddenStyles : undefined]}>{children}</div>
    </div>
  );
};
