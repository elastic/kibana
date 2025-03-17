/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { css, keyframes } from '@emotion/react';
import { COLOR_MODES_STANDARD } from '@elastic/eui';
const fullScreenGraphicsFadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

export const fullScreenGraphicsMixinStyles = (euiZLevel, euiTheme) => {
  console.log('inside mixin');
  const lightOrDarkTheme = (light, dark) => {
    const result = euiTheme.colorMode === COLOR_MODES_STANDARD.light ? light : dark; // nothing changes
    console.log('result:', result);
    return result;
  };
  return css({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: '5px solid red',
    zIndex: euiZLevel + 1000,
    background: 'inherit',
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    opacity: 0,
    overflow: 'auto',
    animation: `${fullScreenGraphicsFadeIn} ${euiTheme.animation.extraSlow} ${euiTheme.animation.resistance} 0s forwards`,
    '.kbnBody--hasHeaderBanner &': {
      top: 'var(--kbnHeaderBannerHeight)',
    },
    '&::before': {
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 1,
      width: '400px',
      height: '400px',
      content: `url(${lightOrDarkTheme(
        '~core_app_image_assets/bg_top_branded.svg',
        '~core_app_image_assets/bg_top_branded_dark.svg'
      )})`,
    },
    '&::after': {
      position: 'fixed',
      bottom: 0,
      right: 0,
      zIndex: 1,
      width: '400px',
      height: '400px',
      content: `url(${lightOrDarkTheme(
        '~core_app_image_assets/bg_bottom_branded.svg',
        '~core_app_image_assets/bg_bottom_branded_dark.svg'
      )})`,
    },
  });
  // return css`
  //   position: fixed;
  //   top: 0;
  //   left: 0;
  //   right: 0;
  //   bottom: 0;
  //   z-index: ${euiZLevel + 1000};
  //   background: inherit;
  //   background-color: ${euiTheme.colors.backgroundBasePlain};
  //   opacity: 0;
  //   overflow: auto;
  //   animation: ${fullScreenGraphicsFadeIn} ${euiTheme.animation.extraSlow}
  //     ${euiTheme.animation.resistance} 0s forwards;

  //   .kbnBody--hasHeaderBanner & {
  //     top: var(--kbnHeaderBannerHeight);
  //   }

  //   &::before {
  //     position: fixed;
  //     top: 0;
  //     left: 0;
  //     z-index: 1;
  //     width: 400px;
  //     height: 400px;
  //     content: url(${lightOrDarkTheme(
  //       '~core_app_image_assets/bg_top_branded.svg',
  //       '~core_app_image_assets/bg_top_branded_dark.svg'
  //     )});
  //   }

  //   &::after {
  //     position: fixed;
  //     bottom: 0;
  //     right: 0;
  //     z-index: 1;
  //     width: 400px;
  //     height: 400px;
  //     content: url(${lightOrDarkTheme(
  //       '~core_app_image_assets/bg_bottom_branded.svg',
  //       '~core_app_image_assets/bg_bottom_branded_dark.svg'
  //     )});
  //   }

  //   @media only screen and (max-width: ${euiTheme.breakpoint.l}) {
  //     &::before,
  //     &::after {
  //       content: none;
  //     }
  //   }
  // `;
};
