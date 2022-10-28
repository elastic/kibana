/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/react';

/**
 *
 * Style overrides for the setup guide dropdown panel.
 * There is currently no existing EUI component that fully supports what we need.
 * In order to leverage a11y features, we are using the EuiFlyout and applying customizations
 * See https://github.com/elastic/eui/issues/6241 for more details
 */
export const getGuidePanelStyles = (euiTheme: EuiThemeComputed) => ({
  flyoutOverrides: {
    flyoutContainer: css`
      top: 55px !important;
      bottom: unset !important;
      right: 128px;
      border-radius: 6px;
      width: 480px;
      height: auto !important;
      animation: euiModal 350ms cubic-bezier(0.34, 1.61, 0.7, 1);
      box-shadow: none;

      @media (max-width: 574px) {
        right: 25px !important;
      }
    `,
    flyoutBody: css`
      .euiFlyoutBody__overflowContent {
        width: 480px;
        padding-top: 10px;

        @media (max-width: 574px) {
          width: 100%;
        }
      }
    `,
    flyoutFooter: css`
      border-radius: 0 0 6px 6px;
      background: transparent;
      padding: 24px 30px;
    `,
    flyoutFooterLink: css`
      color: ${euiTheme.colors.darkShade};
      font-weight: 400;
    `,
  },
});
