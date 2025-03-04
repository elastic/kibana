/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { EuiThemeComputed, euiFlyoutSlideInRight } from '@elastic/eui';
import { css } from '@emotion/react';
const fixedHeaderOffset = `var(--kbnAppHeadersOffset, var(--euiFixedHeadersOffset, 0))`;

export const triggerAnimationOnRef = (
  divRef: HTMLDivElement | null,
  className: string,
  duration = 250
): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => divRef?.classList.add(className), 0);
    setTimeout(() => {
      divRef?.classList.remove(className);
      resolve();
    }, duration);
  });
};

export const getZIndex = (isActive: boolean) =>
  isActive
    ? css`
        z-index: 5;
      `
    : css`
        z-index: 0;
      `;

export const getJourneyFlyoutParentStyles = (euiTheme: EuiThemeComputed, width: number) => css`
  position: fixed;
  display: flex;
  flex-direction: column;
  top: ${fixedHeaderOffset};
  right: 0;
  height: calc(100vh - ${fixedHeaderOffset});
  width: ${width}px;
  transition: width ${euiTheme.animation.fast} ease-out;
  z-index: ${euiTheme.levels.flyout};
  animation: ${euiFlyoutSlideInRight} ${euiTheme.animation.fast} ease-out;

  .journey-flyout-toolbar {
    padding: ${euiTheme.size.s};
    border-left: ${euiTheme.border.thin};
    border-bottom: ${euiTheme.border.thin};
    background-color: ${euiTheme.colors.backgroundBasePlain};
  }

  .journey-flyout-content-container {
    position: relative;
    flex-grow: 1;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .journey-flyout-content {
    width: 100%;
    height: 100%;
    position: absolute;
    padding: ${euiTheme.size.s};
    border-left: ${euiTheme.border.thin};
    background-color: ${euiTheme.colors.backgroundBasePlain};
  }

  .journey-flyout-shadow {
    opacity: 0.2;
    width: 100%;
    height: 100%;
    transition: opacity ${euiTheme.animation.extraFast};
    position: absolute;
    pointer-events: none;
    padding: ${euiTheme.size.s};
    background-color: ${euiTheme.colors.plainDark};
    z-index: 2;
  }

  .slide-in {
    animation: ${euiFlyoutSlideInRight} ${euiTheme.animation.normal} ease-out;
  }

  .slide-out {
    animation: ${euiFlyoutSlideInRight} ${euiTheme.animation.normal} ease-in reverse;
  }
`;

export const getJourneyFlyoutChildStyles = (
  euiTheme: EuiThemeComputed,
  width: number,
  backgroundColor?: string
) => css`
  position: fixed;
  display: flex;
  flex-direction: column;
  top: ${fixedHeaderOffset};
  transition: right ${euiTheme.animation.fast} ease-out;
  width: ${width}px;
  background-color: ${backgroundColor ? backgroundColor : euiTheme.colors.backgroundBaseSubdued};
  z-index: ${euiTheme.levels.flyout};
  height: calc(100vh - ${fixedHeaderOffset});
  border-left: ${euiTheme.border.thin};

  .journey-flyout-toolbar {
    padding: ${euiTheme.size.s};
    border-left: ${euiTheme.border.thin};
    border-bottom: ${euiTheme.border.thin};
    background-color: ${backgroundColor ? backgroundColor : euiTheme.colors.backgroundBaseSubdued};
  }
`;
