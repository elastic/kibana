/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import React from 'react';
import { motion } from 'motion/react';

import { APP_MAIN_SCROLL_CONTAINER_ID } from '@kbn/ui-chrome-layout-constants';

import { contentHiddenStyles, styles } from './layout_application.styles';
import { useLayoutConfig } from '../layout_config_context';
import {
  getPanelLayoutTransition,
  shouldAnimateApplicationPanelWidth,
} from '../panel_layout_transition';

/**
 * The application slot wrapper
 *
 * @param props - Props for the LayoutApplication component.
 * @returns The rendered LayoutApplication component.
 */
export const LayoutApplication = ({
  children,
  topBar,
  bottomBar,
}: {
  children: ReactNode;
  topBar?: ReactNode;
  bottomBar?: ReactNode;
}) => {
  const {
    chromeStyle,
    applicationWorkspaceOpen = true,
    applicationWorkspaceTransitionPhase = 'none',
  } = useLayoutConfig();

  // Park real app content only while the closing decoy plays — opening reveals content via width tween.
  const parkContent = applicationWorkspaceTransitionPhase === 'closing';

  const targetWidth = applicationWorkspaceOpen ? '100%' : 0;

  const shouldAnimateWidth = shouldAnimateApplicationPanelWidth({
    chromeStyle,
    applicationWorkspaceTransitionPhase,
  });

  return (
    <motion.div
      css={styles.shell}
      className="kbnChromeLayoutApplication"
      initial={false}
      animate={{ width: targetWidth }}
      transition={getPanelLayoutTransition(shouldAnimateWidth)}
      data-test-subj="kbnChromeLayoutApplication"
      data-application-workspace-open={applicationWorkspaceOpen}
    >
      <div css={styles.panel(chromeStyle)} id={APP_MAIN_SCROLL_CONTAINER_ID}>
        {topBar && (
          <div css={[styles.topBar, parkContent ? contentHiddenStyles : undefined]}>{topBar}</div>
        )}
        <div css={[styles.content, parkContent ? contentHiddenStyles : undefined]}>{children}</div>
        {bottomBar && (
          <div css={[styles.bottomBar, parkContent ? contentHiddenStyles : undefined]}>
            {bottomBar}
          </div>
        )}
      </div>
    </motion.div>
  );
};
