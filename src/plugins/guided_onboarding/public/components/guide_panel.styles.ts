/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  euiCanAnimate,
  euiFlyoutSlideInRight,
  euiYScroll,
  logicalCSS,
  logicalCSSWithFallback,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { UseEuiTheme } from '@elastic/eui/src/services/theme/hooks';
import panelBgTop from '../../assets/panel_bg_top.svg';
import panelBgTopDark from '../../assets/panel_bg_top_dark.svg';
import panelBgBottom from '../../assets/panel_bg_bottom.svg';
import panelBgBottomDark from '../../assets/panel_bg_bottom_dark.svg';

/**
 *
 * Style overrides for the setup guide dropdown panel.
 * There is currently no existing EUI component that fully supports what we need.
 * In order to leverage a11y features, we are using the EuiFlyout and applying customizations
 * See https://github.com/elastic/eui/issues/6241 for more details
 */
export const getGuidePanelStyles = ({
  euiThemeContext,
  isDarkTheme,
}: {
  euiThemeContext: UseEuiTheme;
  isDarkTheme: boolean;
}) => {
  const euiTheme = euiThemeContext.euiTheme;
  const flyoutContainerBase = css`
    position: fixed;
    height: 100%;
    max-height: 76vh;
    max-inline-size: 480px;
    max-block-size: auto;
    inset-inline-end: 0;
    inset-block-start: ${euiTheme.size.xxxl};
    ${euiCanAnimate} {
      animation: ${euiFlyoutSlideInRight} ${euiTheme.animation.normal}
        ${euiTheme.animation.resistance};
    }
    @media (max-width: ${euiTheme.breakpoint.m}px) {
      max-height: 85vh;
    })
    @media (min-width: ${euiTheme.breakpoint.m}px) {
      right: calc(${euiTheme.size.s} + 128px); // Accounting for margin on button
    })
  `;

  return {
    setupButton: css`
      margin-right: ${euiTheme.size.m};
    `,
    wellDoneAnimatedPrompt: css`
      text-align: left;
    `,
    flyoutOverrides: {
      flyoutContainer: css`
        ${flyoutContainerBase};
        background: ${euiTheme.colors.emptyShade} url(${isDarkTheme ? panelBgTopDark : panelBgTop})
          top right no-repeat;
        padding: 0;
      `,
      flyoutContainerError: css`
        ${flyoutContainerBase};
        padding: 24px;
      `,
      flyoutHeader: css`
        flex-grow: 0;
        padding: 16px 16px 0;
      `,
      flyoutHeaderError: css`
        flex-grow: 0;
        padding: 8px 0 0;
      `,
      flyoutContentWrapper: css`
        display: flex;
        block-size: 100%;
        justify-content: space-between;
        flex-direction: column;
      `,
      flyoutCloseButtonIcon: css`
        position: absolute;
        inset-block-start: ${euiTheme.size.base};
        inset-inline-end: ${euiTheme.size.base};
      `,
      flyoutBodyWrapper: css`
        ${logicalCSS('height', '100%')}
        ${logicalCSSWithFallback('overflow-y', 'hidden')}
      flex-grow: 1;
      `,
      flyoutBody: css`
        ${euiYScroll(euiThemeContext)}
        padding: 16px 10px 0 16px;
      `,
      flyoutBodyError: css`
        height: 600px;
      `,
      flyoutStepsWrapper: css`
        > li {
          list-style-type: none;
        }
        margin-inline-start: 0 !important;
      `,
      flyoutFooter: css`
        border-radius: 0 0 6px 6px;
        background: url(${isDarkTheme ? panelBgBottomDark : panelBgBottom}) 0 36px no-repeat;
        padding: 24px 30px;
        height: 125px;
        flex-grow: 0;
      `,
      flyoutFooterLink: css`
        color: ${euiTheme.colors.darkShade};
        font-weight: 400;
      `,
    },
  };
};
