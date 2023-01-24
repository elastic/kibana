/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';
import panelBgTop from '../../assets/panel_bg_top.svg';
import panelBgBottom from '../../assets/panel_bg_bottom.svg';

/**
 *
 * Style overrides for the setup guide dropdown panel.
 * There is currently no existing EUI component that fully supports what we need.
 * In order to leverage a11y features, we are using the EuiFlyout and applying customizations
 * See https://github.com/elastic/eui/issues/6241 for more details
 */
export const getGuidePanelStyles = (euiTheme: EuiThemeComputed) => ({
  setupButton: css`
    margin-right: ${euiTheme.size.m};
  `,
  flyoutOverrides: {
    flyoutHeader: css`
      background: url(${panelBgTop}) top right no-repeat;
    `,
    flyoutContainer: css`
      top: 55px !important;
      // Unsetting bottom and height default values to create auto height
      bottom: unset !important;
      height: unset !important;
      right: calc(${euiTheme.size.s} + 128px); // Accounting for margin on button
      border-radius: 6px;
      animation: euiModal 350ms cubic-bezier(0.34, 1.61, 0.7, 1);
      box-shadow: none;
      max-height: 76vh;
      @media (max-width: ${euiTheme.breakpoint.s}px) {
        right: 25px !important;
      }
    `,
    flyoutBody: css`
      overflow: auto;
      .euiFlyoutBody__overflowContent {
        width: 480px;
        padding-top: 10px;
        @media (max-width: ${euiTheme.breakpoint.s}px) {
          width: 100%;
        }
      }
    `,
    flyoutFooter: css`
      border-radius: 0 0 6px 6px;
      background: url(${panelBgBottom}) -10px 0 no-repeat;
      padding: 24px 30px;
    `,
    flyoutFooterLink: css`
      color: ${euiTheme.colors.darkShade};
      font-weight: 400;
    `,
  },
});
