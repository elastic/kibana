/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import { euiSlightShadowHover, type EuiThemeComputed, type UseEuiTheme } from '@elastic/eui';

interface TabWithBackgroundStyleParams {
  isSelected: boolean;
  isDragging: boolean;
  hideRightSeparator: boolean;
  euiTheme: EuiThemeComputed;
  euiThemeContext: UseEuiTheme;
}

export const getTabWithBackgroundStyles = ({
  isSelected,
  isDragging,
  hideRightSeparator,
  euiTheme,
  euiThemeContext,
}: TabWithBackgroundStyleParams) => {
  return {
    // tab main background and another background color on hover
    wrapper: css`
      position: relative;
      display: inline-block;
      border-radius: ${euiTheme.border.radius.small};
      // reserve space for the active-tab accent so selecting a tab doesn't shift its height
      border-top: ${euiTheme.size.xxs} solid transparent;
      background: ${isSelected || isDragging ? euiTheme.colors.backgroundBasePlain : 'transparent'};
      transition: background ${euiTheme.animation.fast};
      margin: ${euiTheme.size.xs};
      margin-bottom: 0;
      padding-bottom: ${isDragging ? '0' : euiTheme.size.xs};

      ${isSelected
        ? `
          position: relative;
          // colored accent on top of the active tab card
          border-top-color: ${euiTheme.colors.primary};
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
          filter: drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.06))
                  drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.04));
        `
        : ''}

      ${isDragging
        ? `
          ${euiSlightShadowHover(euiThemeContext)};
          border-radius: ${euiTheme.border.radius.small};
      `
        : ''}

      // right vertical separator
      &::before {
        content: '';
        position: absolute;
        right: -${euiTheme.size.xs};
        top: calc(
          50% - ${euiTheme.size.xs} / 2
        ); // 50% is the tab height midpoint, we want it centered in the middle of the whole tab bar
        transform: translateY(-50%);
        width: 1px;
        height: ${euiTheme.size.base};
        background-color: ${euiTheme.colors.borderBasePlain};
        transition: opacity ${euiTheme.animation.fast};
        opacity: ${hideRightSeparator || isDragging ? '0' : '1'};
        pointer-events: none;
      }
    `,
    inner: css`
      ${!isSelected
        ? `
        &:hover {
          background-color: ${euiTheme.colors.lightShade};
          border-radius: ${euiTheme.border.radius.small};
        }
      `
        : ''}
    `,
    showAccents: isSelected && !isDragging,
  };
};

export const getTabsBarWithBackgroundStyles = (euiTheme: EuiThemeComputed) =>
  css`
    // tabs bar background
    background: ${euiTheme.colors.backgroundBasePlain};
  `;
