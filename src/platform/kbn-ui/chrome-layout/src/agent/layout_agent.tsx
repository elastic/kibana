/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { euiIncludeSelectorInFocusTrap } from '@kbn/ui-chrome-layout-constants';

import { useLayoutConfig } from '../layout_config_context';
import {
  getPanelLayoutTransition,
  shouldAnimateAgentPanelWidth,
} from '../panel_layout_transition';
import { resolveAgentPanelTargetWidth } from './resolve_agent_panel_target_width';
import { useSyncAgentWidthDuringAnimation } from './use_sync_agent_width_during_animation';
import { CONTENT_FADE_MS, contentHiddenStyles, styles } from './layout_agent.styles';

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
    agentPreferredWidth = 0,
    navigationWidth = 0,
    sidebarWidth = 0,
    agentMarginLeft = 0,
    applicationMarginRight = 0,
  } = useLayoutConfig();

  const targetWidth = useMemo(
    () =>
      resolveAgentPanelTargetWidth({
        chromeStyle,
        agentWorkspaceOpen,
        applicationWorkspaceOpen,
        agentPreferredWidth,
        navigationWidth,
        sidebarWidth,
        agentMarginLeft,
        applicationMarginRight,
      }),
    [
      agentMarginLeft,
      agentPreferredWidth,
      agentWorkspaceOpen,
      applicationMarginRight,
      applicationWorkspaceOpen,
      chromeStyle,
      navigationWidth,
      sidebarWidth,
    ]
  );

  const shouldAnimateWidth = shouldAnimateAgentPanelWidth({
    chromeStyle,
    agentWorkspaceOpen,
    applicationWorkspaceOpen,
    applicationWorkspaceTransitionPhase,
  });

  const shouldSyncVisibleWidth = chromeStyle === 'project';
  const { syncWidth, flushWidth } = useSyncAgentWidthDuringAnimation(shouldSyncVisibleWidth);

  const prevAgentWorkspaceOpenRef = useRef(agentWorkspaceOpen);
  const prevTargetWidthRef = useRef(targetWidth);
  const [contentOpacity, setContentOpacity] = useState(agentWorkspaceOpen ? 1 : 0);
  const [isContentVisibilityHidden, setIsContentVisibilityHidden] = useState(!agentWorkspaceOpen);

  const isDualPanelClose =
    shouldAnimateWidth && applicationWorkspaceOpen && !agentWorkspaceOpen;

  const widthTransition = useMemo(() => {
    if (!shouldAnimateWidth) {
      return { duration: 0 };
    }

    const base = getPanelLayoutTransition(true);

    if (isDualPanelClose) {
      return { ...base, delay: CONTENT_FADE_MS / 1000 };
    }

    return base;
  }, [isDualPanelClose, shouldAnimateWidth]);

  useLayoutEffect(() => {
    if (!shouldSyncVisibleWidth || shouldAnimateWidth) {
      return;
    }

    flushWidth(targetWidth);
  }, [flushWidth, shouldAnimateWidth, shouldSyncVisibleWidth, targetWidth]);

  useLayoutEffect(() => {
    const prevOpen = prevAgentWorkspaceOpenRef.current;
    const prevWidth = prevTargetWidthRef.current;

    if (!shouldAnimateWidth) {
      setContentOpacity(agentWorkspaceOpen ? 1 : 0);
      setIsContentVisibilityHidden(!agentWorkspaceOpen);
      prevAgentWorkspaceOpenRef.current = agentWorkspaceOpen;
      prevTargetWidthRef.current = targetWidth;
      return;
    }

    if (prevOpen && !agentWorkspaceOpen && applicationWorkspaceOpen) {
      setIsContentVisibilityHidden(false);
      setContentOpacity(0);
    } else if (!prevOpen && agentWorkspaceOpen && applicationWorkspaceOpen) {
      setIsContentVisibilityHidden(true);
      setContentOpacity(0);
    } else if (agentWorkspaceOpen && targetWidth < prevWidth) {
      setIsContentVisibilityHidden(false);
      setContentOpacity(0);
    }

    prevAgentWorkspaceOpenRef.current = agentWorkspaceOpen;
    prevTargetWidthRef.current = targetWidth;
  }, [
    agentWorkspaceOpen,
    applicationWorkspaceOpen,
    shouldAnimateWidth,
    targetWidth,
  ]);

  const handleUpdate = useCallback(
    (latest: { width?: number | string }) => {
      if (typeof latest.width === 'number') {
        syncWidth(latest.width);
      }
    },
    [syncWidth]
  );

  const handleShellAnimationComplete = useCallback(() => {
    flushWidth(targetWidth);

    if (!shouldAnimateWidth) {
      return;
    }

    if (agentWorkspaceOpen) {
      setIsContentVisibilityHidden(false);
      requestAnimationFrame(() => {
        setContentOpacity(1);
      });
      return;
    }

    setIsContentVisibilityHidden(true);
  }, [agentWorkspaceOpen, flushWidth, shouldAnimateWidth, targetWidth]);

  const handleContentAnimationComplete = useCallback(() => {
    if (isDualPanelClose && contentOpacity === 0) {
      setIsContentVisibilityHidden(true);
    }
  }, [contentOpacity, isDualPanelClose]);

  return (
    <motion.div
      css={styles.shell()}
      className="kbnChromeLayoutAgent"
      initial={false}
      animate={{ width: targetWidth }}
      transition={widthTransition}
      onUpdate={handleUpdate}
      onAnimationComplete={handleShellAnimationComplete}
      data-test-subj="kbnChromeLayoutAgent"
      data-agent-workspace-open={agentWorkspaceOpen}
      {...euiIncludeSelectorInFocusTrap.prop}
    >
      <div css={styles.panel(chromeStyle)}>
        <motion.div
          css={[styles.content, isContentVisibilityHidden ? contentHiddenStyles : undefined]}
          initial={false}
          animate={{ opacity: contentOpacity }}
          transition={{
            duration: shouldAnimateWidth ? CONTENT_FADE_MS / 1000 : 0,
            ease: 'easeInOut',
          }}
          onAnimationComplete={handleContentAnimationComplete}
        >
          {children}
        </motion.div>
      </div>
    </motion.div>
  );
};
