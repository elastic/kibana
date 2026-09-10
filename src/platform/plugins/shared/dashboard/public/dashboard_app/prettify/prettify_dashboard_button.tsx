/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { layoutVar } from '@kbn/core-chrome-layout-constants';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { AiButton } from '@kbn/shared-ux-ai-components';
import type { DashboardApi } from '../../dashboard_api/types';
import { usePrettifyDashboardAction } from './use_prettify_dashboard_action';

export const PrettifyDashboardButton = ({ dashboardApi }: { dashboardApi: DashboardApi }) => {
  const action = usePrettifyDashboardAction(dashboardApi);
  const styles = useMemoCss(buttonStyles);

  if (!action) {
    return null;
  }

  return (
    <div css={styles.overlay}>
      <AiButton
        variant="base"
        size="s"
        iconType="sparkles"
        data-test-subj="dashboardPrettifyButton"
        onClick={() => {
          void action.execute();
        }}
      >
        {action.displayName}
      </AiButton>
    </div>
  );
};

const buttonStyles = {
  overlay: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'fixed',
      bottom: `calc(${layoutVar('application.content.bottom', '0px')} + ${euiTheme.size.l})`,
      left: layoutVar('application.content.left', '0px'),
      right: layoutVar('application.content.right', '0px'),
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: euiTheme.levels.header,
      '& > *': {
        pointerEvents: 'auto',
      },
    }),
};
