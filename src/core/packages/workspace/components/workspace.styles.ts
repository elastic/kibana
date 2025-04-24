/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { useIsToolbarRight } from '@kbn/core-workspace-state';

// TODO: clintandrewhall - Handle smaller screens using `useEuiBreakpoints`.

export const useWorkspaceStyles = () => {
  const { euiTheme } = useEuiTheme();
  const isToolbarRight = useIsToolbarRight();

  const workspace = css`
    align-items: baseline;
    min-height: 100%;
    min-width: 100%;

    display: grid;

    grid-template-columns:
      var(--kbnWorkspace--navigation-width, 0)
      1fr
      var(${isToolbarRight ? '--kbnWorkspace--tool-width' : '--kbnWorkspace--toolbar-width'}, 0)
      var(${isToolbarRight ? '--kbnWorkspace--toolbar-width' : '--kbnWorkspace--tool-width'}, 0)

    grid-template-rows:
      var(--kbnWorkspace--banner-height, 0)
      var(--kbnWorkspace--header-height, 0)
      1fr
      var(--kbnWorkspace--footer-height, 0);

    grid-template-areas:
      'banner banner banner banner'
      'header header ${isToolbarRight ? 'tool toolbar' : 'toolbar tool'}'
      'navigation app ${isToolbarRight ? 'tool toolbar' : 'toolbar tool'}'
      'navigation footer ${isToolbarRight ? 'tool toolbar' : 'toolbar tool'}';

    .euiCollapsibleNavButtonWrapper {
      border-right: none;
      background: none;
      margin: 0;
    }

    .euiCollapsibleNavBeta {
      border-right: none;
      background: none;
      box-shadow: none;

      .euiFlyoutFooter {
        background: none;
      }
    }

    .euiPage {
      border-top-left-radius: ${euiTheme.border.radius.medium};
      border-top-right-radius: ${euiTheme.border.radius.medium};
    }
  `;

  return {
    workspace,
  };
};
