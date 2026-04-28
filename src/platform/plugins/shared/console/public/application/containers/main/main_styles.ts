/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, useEuiOverflowScroll } from '@elastic/eui';
import { css } from '@emotion/react';

export const useMainStyles = (isEmbeddable: boolean) => {
  const { euiTheme } = useEuiTheme();

  return {
    consoleContainer: css`
      display: flex;
      flex: 1 1 auto;
      // Make sure the editor actions don't create scrollbars on this container
      // SASSTODO: Uncomment when tooltips are EUI-ified (inside portals)
      overflow: hidden;
      gap: 0;
      ${isEmbeddable &&
      css`
        padding: 0;
        gap: 0;
      `}

      /*
      * The z-index for the autocomplete suggestions popup
      */
      .kibanaCodeEditor .monaco-editor .suggest-widget {
        // the value needs to be above the z-index of the resizer bar
        z-index: ${euiTheme.levels.header} + 2;
      }
    `,

    consoleTabs: css`
      padding: 0 ${euiTheme.size.s};
    `,

    // Scrollable panel with body background
    scrollablePanelWithBackground: css`
      ${useEuiOverflowScroll('y', false)}
      background-color: ${euiTheme.colors.body};
    `,
  };
};
