/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { useHasLegacyActionMenu } from '../shared/chrome_hooks';
import { AiButtonSlot } from './ai_button_slot';
import { ProjectNextAppMenu } from './app_menu';
import { useAiButtons, useProjectNextAppMenu } from './hooks';

const useTrailingStyles = () => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const root = css`
      display: flex;
      align-items: center;
      gap: ${euiTheme.size.s};
      flex-shrink: 0;
      margin-left: auto;
    `;

    return { root };
  }, [euiTheme]);
};

/**
 * Trailing region of the Chrome-Next project header (app menu, AI button, future global actions).
 * Renders nothing when no trailing content is available.
 */
export const ProjectNextTrailingActions = React.memo(() => {
  const appMenuConfig = useProjectNextAppMenu();
  const hasLegacyActionMenu = useHasLegacyActionMenu();
  const aiButtons = useAiButtons();
  const styles = useTrailingStyles();

  const hasTrailingContent = !!appMenuConfig || hasLegacyActionMenu || aiButtons.length > 0;

  if (!hasTrailingContent) {
    return null;
  }

  return (
    <div css={styles.root} data-test-subj="chromeProjectNextHeaderTrailing">
      <ProjectNextAppMenu />
      <AiButtonSlot />
    </div>
  );
});

ProjectNextTrailingActions.displayName = 'ProjectNextTrailingActions';
