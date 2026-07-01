/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties, ReactNode, TransitionEvent } from 'react';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import classNames from 'classnames';
import { css } from '@emotion/react';
import { euiIncludeSelectorInFocusTrap } from '@kbn/ui-chrome-layout-constants';

import { useLayoutConfig } from '../layout_config_context';
import {
  AGENT_PANEL_WIDTH_CSS_VAR,
  CONTENT_FADE_MS,
  contentFadeStyles,
  contentHiddenStyles,
  styles,
} from './layout_agent.styles';

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

  // Keep agent width transitions off while the application decoy is animating.
  const useWidthTransition =
    chromeStyle === 'project' &&
    applicationWorkspaceOpen &&
    applicationWorkspaceTransitionPhase === 'none' &&
    !prefersReducedMotion();
  const useInstantHide = !useWidthTransition;

  const prevAgentWorkspaceOpenRef = useRef(agentWorkspaceOpen);
  const lastExpandedPanelWidthRef = useRef(agentWidth);
  const closeFadeFallbackTimeoutRef = useRef<number | undefined>(undefined);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(!agentWorkspaceOpen);
  const [contentOpacity, setContentOpacity] = useState(agentWorkspaceOpen ? 1 : 0);
  const [isContentVisibilityHidden, setIsContentVisibilityHidden] = useState(
    !agentWorkspaceOpen && useInstantHide
  );

  useLayoutEffect(() => {
    if (agentWidth > 0) {
      lastExpandedPanelWidthRef.current = agentWidth;
    }
  }, [agentWidth]);

  const beginPanelCollapse = useCallback(() => {
    if (closeFadeFallbackTimeoutRef.current !== undefined) {
      window.clearTimeout(closeFadeFallbackTimeoutRef.current);
      closeFadeFallbackTimeoutRef.current = undefined;
    }

    setIsContentVisibilityHidden(true);
    setIsPanelCollapsed(true);
  }, []);

  useLayoutEffect(() => {
    if (useInstantHide) {
      if (closeFadeFallbackTimeoutRef.current !== undefined) {
        window.clearTimeout(closeFadeFallbackTimeoutRef.current);
        closeFadeFallbackTimeoutRef.current = undefined;
      }

      setIsPanelCollapsed(!agentWorkspaceOpen);
      setContentOpacity(agentWorkspaceOpen ? 1 : 0);
      setIsContentVisibilityHidden(!agentWorkspaceOpen);
      prevAgentWorkspaceOpenRef.current = agentWorkspaceOpen;
      return;
    }

    if (
      useWidthTransition &&
      prevAgentWorkspaceOpenRef.current !== agentWorkspaceOpen
    ) {
      if (!agentWorkspaceOpen) {
        setIsContentVisibilityHidden(false);
        setContentOpacity(0);

        closeFadeFallbackTimeoutRef.current = window.setTimeout(() => {
          closeFadeFallbackTimeoutRef.current = undefined;
          beginPanelCollapse();
        }, CONTENT_FADE_MS + 50);
      } else {
        if (closeFadeFallbackTimeoutRef.current !== undefined) {
          window.clearTimeout(closeFadeFallbackTimeoutRef.current);
          closeFadeFallbackTimeoutRef.current = undefined;
        }

        setIsPanelCollapsed(false);
        setIsContentVisibilityHidden(true);
        setContentOpacity(0);
      }
    }

    prevAgentWorkspaceOpenRef.current = agentWorkspaceOpen;
  }, [agentWorkspaceOpen, beginPanelCollapse, useInstantHide, useWidthTransition]);

  useLayoutEffect(
    () => () => {
      if (closeFadeFallbackTimeoutRef.current !== undefined) {
        window.clearTimeout(closeFadeFallbackTimeoutRef.current);
      }
    },
    []
  );

  const handleContentTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || event.propertyName !== 'opacity') {
        return;
      }

      if (!useWidthTransition || agentWorkspaceOpen) {
        return;
      }

      beginPanelCollapse();
    },
    [agentWorkspaceOpen, beginPanelCollapse, useWidthTransition]
  );

  const handlePanelTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLDivElement>) => {
      if (
        event.target !== event.currentTarget ||
        !useWidthTransition ||
        event.propertyName !== 'width'
      ) {
        return;
      }

      if (!agentWorkspaceOpen) {
        return;
      }

      setIsContentVisibilityHidden(false);

      requestAnimationFrame(() => {
        setContentOpacity(1);
      });
    },
    [agentWorkspaceOpen, useWidthTransition]
  );

  const panelStyle = useMemo((): CSSProperties | undefined => {
    if (!useWidthTransition) {
      return undefined;
    }

    const panelWidth = agentWidth > 0 ? agentWidth : lastExpandedPanelWidthRef.current;
    if (panelWidth <= 0) {
      return undefined;
    }

    return {
      [AGENT_PANEL_WIDTH_CSS_VAR]: `${panelWidth}px`,
    } as CSSProperties;
  }, [agentWidth, useWidthTransition]);

  const contentStyle = useMemo(
    (): CSSProperties => ({
      opacity: contentOpacity,
      pointerEvents: contentOpacity === 0 ? 'none' : 'auto',
    }),
    [contentOpacity]
  );

  return (
    <div
      css={[
        styles.root(chromeStyle, useWidthTransition),
        useInstantHide && isPanelCollapsed ? hiddenStyles : undefined,
      ]}
      className={classNames('kbnChromeLayoutAgent', {
        isCollapsed: useWidthTransition && isPanelCollapsed,
        isClosingShell:
          useWidthTransition && isPanelCollapsed && !agentWorkspaceOpen,
      })}
      style={panelStyle}
      data-test-subj="kbnChromeLayoutAgent"
      data-agent-workspace-open={agentWorkspaceOpen}
      onTransitionEnd={handlePanelTransitionEnd}
      {...euiIncludeSelectorInFocusTrap.prop}
    >
      <div
        css={[
          styles.content,
          contentFadeStyles(useWidthTransition),
          isContentVisibilityHidden ? contentHiddenStyles : undefined,
        ]}
        style={contentStyle}
        onTransitionEnd={handleContentTransitionEnd}
      >
        {children}
      </div>
    </div>
  );
};
