/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transparentize, type EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/css';

const PANEL_WIDTH = '270px';

export const getPanelWrapperStyles = () => css`
  clip-path: polygon(
    0 0,
    150% 0,
    150% 100%,
    0 100%
  ); /* Clip the left side to avoid leaking the shadow on that side */
  height: 100%;
  left: calc(100% + 1px); /* Add 1 px so we see the right border */
  position: absolute;
  top: 0;
`;

export const getNavPanelStyles = (euiTheme: EuiThemeComputed<{}>) => css`
  background-color: ${euiTheme.colors.body};
  height: 100%;
  width: ${PANEL_WIDTH};

  .sideNavPanelLink {
    &:focus-within {
      background-color: transparent;
      a {
        text-decoration: auto;
      }
    }
    &:hover {
      background-color: ${transparentize(euiTheme.colors.primary, 0.1)};
      a {
        text-decoration: underline;
      }
    }
  }
`;
